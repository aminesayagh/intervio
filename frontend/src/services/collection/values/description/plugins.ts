import {
  BoldPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
} from '@platejs/basic-nodes/react'
import { LinkPlugin } from '@platejs/link/react'
import { ListItemPlugin, ListPlugin } from '@platejs/list-classic/react'
import { defaultRules, MarkdownPlugin, type MdRules } from '@platejs/markdown'
import { SlashInputPlugin, SlashPlugin } from '@platejs/slash-command/react'
import type { SlateEditor, Value } from 'platejs'
import { createPlatePlugin, createPlateEditor } from 'platejs/react'
import remarkGfm from 'remark-gfm'
import { ImageElement, ListItemElement } from './elements'
import { LinkElement } from './LinkElement'
import { SlashInput } from './SlashInput'

/** Markdown's images: kept where they are in their line and shown, never added (#36). */
const IMAGE = 'mdImage'
const ImagePlugin = createPlatePlugin({
  key: IMAGE,
  node: { isElement: true, isInline: true, isVoid: true },
}).withComponent(ImageElement)

type MdItem = { checked?: boolean | null }

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
 * heading, bullet list, numbered list, link), the to-do list ("/" offers it), and
 * Markdown in and out. Headings have three levels ("/" offers each; the toolbar's is
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
      data: data.length ? data : [{ type: 'p', children: [{ text: '' }] }],
    }
  } catch (error) {
    return { ok: false, error }
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
