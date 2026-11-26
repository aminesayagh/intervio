import { act, fireEvent } from '@testing-library/react'
import type { SlateEditor } from 'platejs'
import { ELEMENT_TO_NODE } from 'slate-dom'
import { toMarkdown } from '../editor/plugins'

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

/** Puts the cursor at the end of the text, as a click there does (the toolbar shows). */
export async function enter(field: HTMLElement) {
  const editor = editorOf(field)
  fireEvent.focusIn(field)
  await act(async () => editor.tf.select(editor.api.end([])))
}

/** Types text where the cursor is (at the end when it isn't in the text yet). */
export async function typeIn(field: HTMLElement, text: string) {
  const editor = editorOf(field)
  await act(async () => {
    if (!editor.selection) editor.tf.select(editor.api.end([]))
    editor.tf.insertText(text)
  })
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
