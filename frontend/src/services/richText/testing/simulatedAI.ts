import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai'
import type { DescriptionContext } from '../ai/aiContext'

const SAMPLE =
  'Check the seals and the bearings before each use. Report any leak at once, and note the date of the check.'

/** The stand-in answer: "shorter" keeps the selection's first sentence. */
function answer(prompt: string, ctx: DescriptionContext) {
  const selected = ctx.selection ?? ''
  if (/shorter/i.test(prompt) && selected)
    return selected.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? selected
  return SAMPLE
}

const pause = (ms: number) => new Promise((done) => setTimeout(done, ms))

/**
 * An AI that answers in the browser, streamed word by word like the real one, for the
 * tests: given to `RichTextAI` as its `transport`.
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
