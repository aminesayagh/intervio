import { act } from '@testing-library/react'
import type { SlateEditor } from 'platejs'
import { ELEMENT_TO_NODE } from 'slate-dom'
import { toMarkdown } from '../values/description/plugins'

/**
 * Drives the description editor in tests (each step awaited: Slate reports a change a
 * moment after making it, as after a real keystroke). jsdom has no editing (its contenteditable
 * changes the page, never the editor), so the tests type through the editor's API,
 * found from its text box the way Slate itself finds it.
 */
export function editorOf(field: HTMLElement) {
  const editor = ELEMENT_TO_NODE.get(field)
  if (!editor) throw new Error('Not a description editor')
  return editor as unknown as SlateEditor
}

/** Types text where the cursor is. */
export async function typeIn(field: HTMLElement, text: string) {
  await act(async () => editorOf(field).tf.insertText(text))
}

/** Empties the editor, the cursor left in it. */
export async function clearEditor(field: HTMLElement) {
  const editor = editorOf(field)
  await act(async () => {
    editor.tf.setValue([{ type: 'p', children: [{ text: '' }] }])
    editor.tf.select(editor.api.end([]))
  })
}

/** Puts this text in place of the whole content, in one change (like a paste). */
export async function replaceText(field: HTMLElement, text: string) {
  const editor = editorOf(field)
  await act(async () => {
    editor.tf.select({
      anchor: editor.api.start([])!,
      focus: editor.api.end([])!,
    })
    editor.tf.insertText(text)
  })
}

/** Selects the whole text. */
export async function selectAll(field: HTMLElement) {
  const editor = editorOf(field)
  await act(async () =>
    editor.tf.select({
      anchor: editor.api.start([])!,
      focus: editor.api.end([])!,
    }),
  )
}

/** What the editor holds, as Markdown. */
export function markdownOf(field: HTMLElement) {
  return toMarkdown(editorOf(field))
}
