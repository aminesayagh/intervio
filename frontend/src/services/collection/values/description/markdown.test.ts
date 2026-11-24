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
