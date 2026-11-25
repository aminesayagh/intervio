import {
  BlockquotePlugin,
  BoldPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
} from '@platejs/basic-nodes/react'
import { CalloutPlugin } from '@platejs/callout/react'
import { CodeBlockPlugin } from '@platejs/code-block/react'
import { LinkPlugin } from '@platejs/link/react'
import { ListItemPlugin, ListPlugin } from '@platejs/list-classic/react'
import {
  convertNodesSerialize,
  defaultRules,
  MarkdownPlugin,
  serializeMd,
  type MdRules,
} from '@platejs/markdown'
import { SlashInputPlugin, SlashPlugin } from '@platejs/slash-command/react'
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from '@platejs/table/react'
import {
  KEYS,
  PathApi,
  type Descendant,
  type SlateEditor,
  type TElement,
  type Value,
} from 'platejs'
import { createPlatePlugin, createPlateEditor } from 'platejs/react'
import remarkGfm from 'remark-gfm'
import {
  CalloutElement,
  ImageElement,
  ListItemElement,
  TableElement,
  TableCellElement,
  TableHeaderCellElement,
  TableRowElement,
  ToggleElement,
} from './elements'
import { LinkElement } from './LinkElement'
import { SlashInput } from './SlashInput'

/** Markdown's images: kept where they are in their line and shown, never added (#36). */
const IMAGE = 'mdImage'
const ImagePlugin = createPlatePlugin({
  key: IMAGE,
  node: { isElement: true, isInline: true, isVoid: true },
}).withComponent(ImageElement)

/**
 * A toggle: its first block is the title, the others its content, folded away by the
 * title's triangle. Enter on an empty last line of the content leaves the toggle;
 * Backspace at the start of the title turns it back into plain blocks.
 */
export const TOGGLE = 'toggle'
const TogglePlugin = createPlatePlugin({
  key: TOGGLE,
  node: { isElement: true },
})
  .withComponent(ToggleElement)
  .overrideEditor(({ editor, tf: { insertBreak, deleteBackward } }) => {
    /** The toggle around the cursor's block, and that block's place in it. */
    const inToggle = () => {
      const toggle = editor.api.above<TElement>({ match: { type: TOGGLE } })
      const block = editor.api.block()
      if (!toggle || !block || block[1].length !== toggle[1].length + 1) return
      return { toggle, block, index: block[1].at(-1)! }
    }
    return {
      transforms: {
        insertBreak() {
          const at = inToggle()
          if (
            at &&
            at.index > 0 &&
            at.index === at.toggle[0].children.length - 1 &&
            editor.api.isEmpty(at.block[0])
          )
            return editor.tf.moveNodes({
              at: at.block[1],
              to: PathApi.next(at.toggle[1]),
            })
          insertBreak()
        },
        deleteBackward(unit) {
          const at = inToggle()
          if (
            at?.index === 0 &&
            editor.api.isStart(editor.selection?.anchor, at.block[1])
          )
            return editor.tf.unwrapNodes({ at: at.toggle[1] })
          deleteBackward(unit)
        },
      },
    }
  })

type MdItem = { checked?: boolean | null }
type Block = TElement & { [prop: string]: unknown }

/** The callout's saved attributes (Plate's own tag): its icon and variant. */
const attributes = (node: Block) =>
  (['icon', 'variant'] as const)
    .filter((name) => typeof node[name] === 'string')
    .map((name) => ` ${name}="${String(node[name]).replace(/"/g, '&quot;')}"`)
    .join('')

/**
 * The Markdown conversions Plate's own don't cover: a checklist ("- [x]") as a to-do
 * list, ticks kept (#38); an image as an inline image (#36).
 */
const rules: MdRules = {
  list: {
    deserialize: (mdast, deco, options) => {
      const list = defaultRules.list!.deserialize!(mdast, deco, options)
      const items = mdast.children as MdItem[]
      if (!items.some((item) => typeof item.checked === 'boolean')) return list
      return {
        ...list,
        type: 'taskList',
        children: list.children.map((li: object, i: number) => ({
          ...li,
          checked: !!items[i]?.checked,
        })),
      }
    },
  },
  taskList: {
    serialize: (node, options) => {
      const list = defaultRules.list!.serialize!(node, options)
      list.children.forEach((item: MdItem, i: number) => {
        item.checked = !!node.children[i]?.checked
      })
      return list
    },
  },
  // Plate's own tag, inline in its paragraph: <callout icon="💡">Text</callout>.
  callout: {
    serialize: (node, options) => ({
      type: 'paragraph',
      children: [
        { type: 'html', value: `<callout${attributes(node as Block)}>` },
        ...convertNodesSerialize(node.children, options),
        { type: 'html', value: '</callout>' },
      ],
    }),
  },
  // HTML's folding block: <details><summary>Title</summary> content </details>.
  [TOGGLE]: {
    serialize: (node, options) => {
      const [title, ...content] = node.children as Value
      const md = (value: Value) =>
        serializeMd(options.editor!, { value }).replace(/\n+$/, '')
      return {
        type: 'html',
        value: `<details>\n<summary>${md([title])}</summary>\n\n${content.length ? `${md(content)}\n\n` : ''}</details>`,
      }
    },
  },
  img: {
    deserialize: (mdast) => ({
      type: IMAGE,
      url: mdast.url,
      alt: mdast.alt ?? '',
      title: mdast.title,
      children: [{ text: '' }],
    }),
  },
  [IMAGE]: {
    serialize: (node) => ({
      type: 'image',
      url: node.url,
      alt: node.alt,
      title: node.title,
    }),
  },
}

/**
 * The description editor's plugins: the toolbar's features of spec 7.6 (bold, italic,
 * heading, bullet list, numbered list, link), the blocks "/" adds (to-do list, toggle,
 * code block, table, blockquote, callout), and Markdown in and out. Headings have three levels ("/" offers each; the toolbar's is
 * level 2). "/" at the start of a word opens the menu of blocks (never saved: it leaves
 * the text when closed).
 */
export const descriptionPlugins = [
  BoldPlugin,
  ItalicPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ListPlugin,
  BlockquotePlugin,
  // Enter on an empty last line leaves the code block (as the toggle).
  CodeBlockPlugin.overrideEditor(({ editor, tf: { insertBreak } }) => ({
    transforms: {
      insertBreak() {
        const code = editor.api.above<TElement>({
          match: { type: KEYS.codeBlock },
        })
        const line = editor.api.block()
        if (
          code &&
          line &&
          code[0].children.length > 1 &&
          line[1].at(-1) === code[0].children.length - 1 &&
          editor.api.isEmpty(line[0])
        ) {
          editor.tf.removeNodes({ at: line[1] })
          editor.tf.insertNodes(
            { type: KEYS.p, children: [{ text: '' }] },
            { at: PathApi.next(code[1]), select: true },
          )
          return
        }
        insertBreak()
      },
    },
  })),
  TablePlugin.withComponent(TableElement),
  TableRowPlugin.withComponent(TableRowElement),
  TableCellPlugin.withComponent(TableCellElement),
  TableCellHeaderPlugin.withComponent(TableHeaderCellElement),
  CalloutPlugin.withComponent(CalloutElement),
  TogglePlugin,
  // A to-do list's items with their checkbox; the others as they are.
  ListItemPlugin.withComponent(ListItemElement),
  ImagePlugin,
  LinkPlugin.withComponent(LinkElement),
  SlashPlugin,
  SlashInputPlugin.withComponent(SlashInput),
  MarkdownPlugin.configure({
    options: {
      remarkPlugins: [remarkGfm],
      rules,
      // The marks the former Markdown toolbar wrote, so saved texts keep their look.
      remarkStringifyOptions: { bullet: '-', emphasis: '_', strong: '*' },
    },
  }),
]

/** A conversion's result: its data, or `ok: false` when it failed (never partial). */
export type Converted<T> = { ok: true; data: T } | { ok: false; error: unknown }

/** A Markdown text as the editor's content. */
export function parseMarkdown(
  editor: SlateEditor,
  markdown: string,
): Converted<Value> {
  try {
    const data = editor.getApi(MarkdownPlugin).markdown.deserialize(markdown, {
      // Plain Markdown: HTML stays as it was written, never read as MDX (#37).
      withoutMdx: true,
    })
    // Empty, one empty paragraph: where the cursor (and the placeholder) go.
    return {
      ok: true,
      data: data.length
        ? withTags(editor, data)
        : [{ type: 'p', children: [{ text: '' }] }],
    }
  } catch (error) {
    return { ok: false, error }
  }
}

/** A node as Markdown reads it: raw HTML is a text marked `rawHtml`. */
type Read = {
  type?: string
  text?: string
  rawHtml?: boolean
  children?: Read[]
}

/** A block holding only raw HTML: its text. */
const rawHtml = ({ type, children = [] }: Read) =>
  type === 'p' && children.length === 1 && children[0].rawHtml
    ? children[0].text
    : undefined

/**
 * The content with the tags Markdown reads as raw HTML made blocks again: a paragraph
 * <callout …>…</callout> a callout; the blocks from <details><summary>…</summary> to
 * </details> a toggle (nested ones too; one never closed takes the rest).
 */
function withTags(editor: SlateEditor, value: Value): Value {
  const out: Value = []
  const open: Block[] = []
  const add = (block: Descendant) =>
    (open.at(-1)?.children ?? out).push(block as Block)
  for (const block of value) {
    const html = rawHtml(block as Read)
    const summary = html?.match(/^<details>\s*<summary>([\s\S]*)<\/summary>$/)
    if (summary) {
      const [title] = editor
        .getApi(MarkdownPlugin)
        .markdown.deserialize(summary[1], { withoutMdx: true })
      const toggle: Block = {
        type: TOGGLE,
        children: [title ?? { type: 'p', children: [{ text: '' }] }],
      }
      add(toggle)
      open.push(toggle)
    } else if (html === '</details>' && open.length) open.pop()
    else add(callout(block as Block))
  }
  return out
}

/** A paragraph <callout icon="…">…</callout> as a callout; any other block as it is. */
function callout(block: Block): Block {
  const children = block.children as Read[]
  const tag =
    block.type === 'p' && children.length > 1 && children[0].rawHtml
      ? children[0].text?.match(/^<callout((?:\s+\w+="[^"]*")*)\s*>$/)
      : null
  const last = children.at(-1)
  if (!tag || !last?.rawHtml || last.text !== '</callout>') return block
  const props = Object.fromEntries(
    [...tag[1].matchAll(/(\w+)="([^"]*)"/g)].map(([, name, value]) => [
      name,
      value.replace(/&quot;/g, '"'),
    ]),
  )
  const inner = children.slice(1, -1)
  return {
    ...props,
    type: KEYS.callout,
    children: (inner.length ? inner : [{ text: '' }]) as Descendant[],
  }
}

/**
 * The editor's content as Markdown, without the trailing new line remark adds. Empty,
 * it is '' (Plate writes an empty paragraph as a zero-width space).
 */
export function serializeMarkdown(
  editor: SlateEditor,
  /** Part of the content (a selection's fragment); the whole content by default. */
  value?: Value,
): Converted<string> {
  try {
    const markdown = editor
      .getApi(MarkdownPlugin)
      .markdown.serialize(value ? { value } : undefined)
    // Judged on the text written, not the editor: an image alone holds no text.
    const empty = markdown.replace(/\u200b/g, '').trim() === ''
    return { ok: true, data: empty ? '' : markdown.replace(/\n+$/, '') }
  } catch (error) {
    return { ok: false, error }
  }
}

/** A detached editor holding a Markdown text (for the round-trip test). */
export function markdownEditor(markdown: string) {
  return createPlateEditor({
    plugins: descriptionPlugins,
    value: (editor) => {
      const parsed = parseMarkdown(editor, markdown)
      if (!parsed.ok) throw parsed.error
      return parsed.data
    },
  })
}

/** The editor's content as Markdown; throws if it can't be written (tests). */
export function toMarkdown(editor: SlateEditor) {
  const serialized = serializeMarkdown(editor)
  if (!serialized.ok) throw serialized.error
  return serialized.data
}
