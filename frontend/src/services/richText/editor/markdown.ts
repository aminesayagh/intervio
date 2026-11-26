import { MarkdownPlugin } from '@platejs/markdown'
import { KEYS, type Descendant, type SlateEditor, type Value } from 'platejs'
import { createPlateEditor } from 'platejs/react'
import { TOGGLE, type Block } from './blocks'
import { richTextPlugins } from './plugins'

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
    plugins: richTextPlugins,
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
