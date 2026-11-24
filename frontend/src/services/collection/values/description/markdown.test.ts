import { expect, test } from 'vitest'
import { markdownEditor, toMarkdown } from './plugins'

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

// Markdown the editor can't keep, accepted for now (spec 7.6): today's output is
// pinned, so a Plate upgrade that changes it shows up here.
test.each([
  [
    '#36 an image inside a line splits it',
    'See ![Pump](https://example.com/pump.png) here',
    'See&#x20;\n\n![Pump](https://example.com/pump.png)\n\n&#x20;here',
  ],
  [
    '#36 an image alone is kept',
    '![Pump](https://example.com/pump.png)',
    '![Pump](https://example.com/pump.png)',
  ],
  [
    '#37 raw HTML blocks are altered',
    '<div class="note">\nCheck\n</div>',
    '<div className="note">\nCheck\n</div>',
  ],
  [
    '#38 checklists lose their ticks',
    '- [x] Seals\n- [ ] Pump',
    '- Seals\n- Pump',
  ],
  [
    '#39 a single line break becomes a hard break',
    'line one\nline two',
    'line one\\\nline two',
  ],
])('%s', (_, markdown, kept) => {
  expect(afterAnEdit(markdown)).toBe(kept)
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
