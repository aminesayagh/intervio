import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai'
import type { TRange, Value } from 'platejs'

/** What the description sends with each request (issue #35), as Plate's AI does. */
export type DescriptionContext = {
  children: Value
  selection: TRange | null
  toolName: 'edit' | 'generate'
}

const SAMPLE =
  'Check the seals and the bearings before each use. Report any leak at once, and note the date of the check.'

/** The text of the top-level blocks the selection covers. */
function selectedText({ children, selection }: DescriptionContext) {
  if (!selection) return ''
  const [from, to] = [selection.anchor.path[0], selection.focus.path[0]].sort(
    (a, b) => a - b,
  )
  // ponytail: whole blocks, not the exact range; enough for a stand-in answer.
  const text = (node: unknown): string =>
    typeof node === 'object' && node !== null && 'text' in node
      ? String(node.text)
      : ((node as { children?: unknown[] }).children ?? []).map(text).join('')
  return children
    .slice(from, to + 1)
    .map(text)
    .join(' ')
}

/** The stand-in answer: "shorter" keeps the selection's first sentence. */
function answer(prompt: string, ctx: DescriptionContext) {
  const selected = selectedText(ctx)
  if (/shorter/i.test(prompt) && selected)
    return selected.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? selected
  return SAMPLE
}

const pause = (ms: number) => new Promise((done) => setTimeout(done, ms))

/**
 * An AI that answers in the browser, streamed word by word like the real one, so the
 * description's AI can be tried before the backend has it.
 */
export function simulatedTransport(delay = 40): ChatTransport<UIMessage> {
  return {
    async sendMessages({ messages, body, abortSignal }) {
      const ctx = (body as { ctx: DescriptionContext }).ctx
      const last = messages.at(-1)
      const prompt =
        last?.parts
          .map((part) => (part.type === 'text' ? part.text : ''))
          .join('') ?? ''
      const words = answer(prompt, ctx).split(/(?<= )/)
      return new ReadableStream<UIMessageChunk>({
        async start(stream) {
          stream.enqueue({ type: 'start' })
          stream.enqueue({ type: 'text-start', id: 'answer' })
          for (const word of words) {
            if (abortSignal?.aborted) break
            await pause(delay)
            stream.enqueue({ type: 'text-delta', id: 'answer', delta: word })
          }
          stream.enqueue({ type: 'text-end', id: 'answer' })
          stream.enqueue({ type: 'finish' })
          stream.close()
        },
      })
    },
    reconnectToStream: async () => null,
  }
}
