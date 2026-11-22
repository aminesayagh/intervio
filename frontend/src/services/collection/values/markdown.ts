/**
 * A Markdown text's first line as plain text (a rich text's read view in the table):
 * the first line that has words, without its heading, list or quote mark, its bold,
 * italic and code marks, and with a link's text in place of the link.
 */
export function firstLine(markdown: string) {
  const line =
    markdown
      .split('\n')
      .map((text) => text.trim())
      .find((text) => text.replace(/^[#>*\-+\d.\s[\]x]+/i, '').length > 0) ?? ''
  return line
    .replace(/^(#{1,6}\s+|>\s+|[-*+]\s+(\[[ x]\]\s+)?|\d+\.\s+)/i, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .trim()
}
