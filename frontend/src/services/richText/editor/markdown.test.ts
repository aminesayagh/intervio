import { expect, test } from 'vitest'
import { markdownEditor, toMarkdown } from './markdown'

test.each([
  ['bold', 'Seals **checked**'],
  ['italic', 'Seals _checked_'],
  ['heading', '## Inspection'],
  ['bullet list', '- Seals\n- Bearings'],
  ['numbered list', '1. Seals\n2. Bearings'],
  ['link', '[Manual](https://example.com/manual)'],
])('%s: Markdown in, editor, Markdown out, unchanged', (_, markdown) => {
  expect(toMarkdown(markdownEditor(markdown))).toBe(markdown)
})

test('all six together keep their order and their text', () => {
  const markdown = [
    '## Inspection',
    'Seals **checked**, bearings _greased_.',
    '- Pump\n- Valve',
    '1. Stop\n2. Drain',
    'See [the manual](https://example.com/manual).',
  ].join('\n\n')
  expect(toMarkdown(markdownEditor(markdown))).toBe(markdown)
})

/** Edits the text (a first paragraph added), then reads it back as Markdown. */
function afterAnEdit(markdown: string) {
  const editor = markdownEditor(markdown)
  editor.tf.insertNodes(
    { type: 'p', children: [{ text: 'Edited' }] },
    { at: [0] },
  )
  return toMarkdown(editor).replace(/^Edited\n\n/, '')
}

test.each([
  [
    '#36 an image inside a line stays in it',
    'See ![Pump](https://example.com/pump.png) here',
  ],
  ['#36 an image alone', '![Pump](https://example.com/pump.png)'],
  ['#37 raw HTML, as written', '<div class="note">\nCheck\n</div>'],
  ['#38 a checklist keeps its ticks', '- [x] Seals\n- [ ] Pump'],
  [
    "a callout (Plate's tag)",
    '<callout icon="💡">Check the **seals** first</callout>',
  ],
  [
    'a toggle (HTML details), nested',
    '<details>\n<summary>Steps</summary>\n\nDrain the pump\n\n<details>\n<summary>Then</summary>\n\n- Seals\n\n</details>\n\n</details>',
  ],
  ['an empty toggle', '<details>\n<summary>Steps</summary>\n\n</details>'],
  ['a code block', '```\nconst a = 1\n```'],
  ['a code block keeps its language', '```html\n<html></html>\n```'],
])('%s: kept unchanged after an edit', (_, markdown) => {
  expect(afterAnEdit(markdown)).toBe(markdown)
})

// Accepted (2026-11-25, #39): a single line break becomes a hard break, as Shift+Enter
// makes. Pinned, so a Plate upgrade that changes it shows up here.
test('#39 a single line break becomes a hard break', () => {
  expect(afterAnEdit('line one\nline two')).toBe('line one\\\nline two')
})

test('tables, quotes, code, strikethrough and nested lists are kept', () => {
  const markdown = [
    '| Part | State |\n| ---- | ----- |\n| Pump | ok    |',
    '> quoted',
    '```js\nconst a = 1\n```',
    '~~gone~~',
    '- a\n  - b',
  ].join('\n\n')
  expect(afterAnEdit(markdown)).toBe(markdown)
})
