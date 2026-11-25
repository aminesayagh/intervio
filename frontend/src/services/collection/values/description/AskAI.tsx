import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type ChatTransport, type UIMessage } from 'ai'
import { Sparkles } from 'lucide-react'
import { RangeApi } from 'platejs'
import {
  createPlateEditor,
  Plate,
  useEditorRef,
  type PlateEditor,
} from 'platejs/react'
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { csrfHeaders } from '../../../http'
import { notify } from '../../../notifications'
import { Button, PopoverDialog, Show, TextInput } from '../../../ui-kit'
import { EditorText } from './PlateEditor'
import { descriptionPlugins, parseMarkdown, serializeMarkdown } from './plugins'
import { simulatedTransport, type DescriptionContext } from './simulatedAI'

// The backend's AI (decision 153); the tests answer in the browser instead.
const defaultTransport: ChatTransport<UIMessage> =
  import.meta.env.MODE === 'test'
    ? simulatedTransport()
    : new DefaultChatTransport({
        api: '/api/ai/description',
        headers: csrfHeaders,
        credentials: 'same-origin',
      })

/** The message for what the backend answered ({"code": …} or an error chunk's code). */
function failure(error: Error) {
  const code = /ERROR_[A-Z_]+/.exec(error.message)?.[0]
  if (code === 'ERROR_AI_LIMIT') return 'description.aiLimit'
  if (code === 'ERROR_AI_UNAVAILABLE') return 'description.aiUnavailable'
  return 'description.aiFailed'
}

type AI = {
  ask: (prompt: string) => void
  proposal: string
  busy: boolean
  accept: () => void
  reject: () => void
}
const AIContext = createContext<AI | null>(null)

type RangeRef = ReturnType<PlateEditor['api']['rangeRef']>

/**
 * The description's AI: a free prompt about the selection (or the whole text), its
 * answer proposed under the text. Only Accept changes the text, which then saves
 * the usual way; the AI never saves by itself.
 */
export function DescriptionAI({
  scope,
  transport = defaultTransport,
  children,
}: {
  /** The record's notifications scope (a failure is reported there). */
  scope: string
  transport?: ChatTransport<UIMessage>
  children: ReactNode
}) {
  const { t } = useTranslation('collection')
  const editor = useEditorRef()
  // A refused or failed answer is a notification, and the proposal goes (decision 153).
  const chat = useChat({
    transport,
    onError(error) {
      notify({
        tone: 'error',
        text: t(failure(error)),
        scope,
        key: `${scope}:ai`,
      })
      clear()
    },
  })
  // Where the answer goes: the selection when the question was asked, followed
  // through the edits made while the AI answers.
  const target = useRef<RangeRef | null>(null)

  const last = chat.messages.at(-1)
  const proposal =
    last?.role === 'assistant'
      ? last.parts
          .map((part) => (part.type === 'text' ? part.text : ''))
          .join('')
      : ''

  function clear() {
    target.current?.unref()
    target.current = null
    void chat.stop()
    chat.setMessages([])
    chat.clearError()
  }

  const ai: AI = {
    ask(prompt) {
      const selection = editor.selection
      const editing = !!selection && !RangeApi.isCollapsed(selection)
      target.current?.unref()
      target.current = editing ? editor.api.rangeRef(selection) : null
      const document = serializeMarkdown(editor)
      const selected = editing
        ? serializeMarkdown(editor, editor.api.fragment(selection))
        : null
      if (!document.ok || (selected && !selected.ok)) {
        notify({
          tone: 'error',
          text: t('description.aiFailed'),
          scope,
          key: `${scope}:ai`,
        })
        return
      }
      const ctx: DescriptionContext = {
        document: document.data,
        selection: selected?.ok ? selected.data : null,
        toolName: editing ? 'edit' : 'generate',
      }
      chat.setMessages([])
      void chat.sendMessage({ text: prompt }, { body: { ctx } })
    },
    proposal,
    busy: chat.status === 'submitted' || chat.status === 'streaming',
    accept() {
      const parsed = parseMarkdown(editor, proposal)
      if (!parsed.ok) {
        notify({
          tone: 'error',
          text: t('description.aiFailed'),
          scope,
          key: `${scope}:ai`,
        })
        return clear()
      }
      // The selection asked about, where it is now (gone if it was deleted).
      const range = target.current?.current
      editor.tf.focus()
      if (range) {
        editor.tf.select(range)
        editor.tf.insertFragment(parsed.data)
      } else if (editor.api.isEmpty()) {
        editor.tf.replaceNodes(parsed.data, { at: [], children: true })
      } else {
        editor.tf.insertNodes(parsed.data, { at: [editor.children.length] })
      }
      clear()
    },
    reject: clear,
  }

  return <AIContext.Provider value={ai}>{children}</AIContext.Provider>
}

function useAI() {
  const ai = useContext(AIContext)
  if (!ai) throw new Error('Inside DescriptionAI only')
  return ai
}

/** The toolbar's "Ask AI": a free prompt about the selection, or the whole text. */
export function AskAIButton() {
  const { t } = useTranslation('collection')
  const ai = useAI()
  return (
    <PopoverDialog
      label={t('description.askAI')}
      trigger={
        <Button
          look="ghost"
          size="sm"
          aria-label={t('description.askAI')}
          isDisabled={ai.busy}
          className="px-2"
        >
          <Sparkles size={14} />
        </Button>
      }
    >
      {(close) => (
        <PromptForm
          onDone={(prompt) => {
            close()
            ai.ask(prompt)
          }}
        />
      )}
    </PopoverDialog>
  )
}

function PromptForm({ onDone }: { onDone: (prompt: string) => void }) {
  const { t } = useTranslation('collection')
  const [prompt, setPrompt] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (prompt.trim()) onDone(prompt.trim())
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <TextInput
        look="panel"
        autoFocus
        aria-label={t('description.aiPrompt')}
        placeholder={t('description.aiPlaceholder')}
        value={prompt}
        onChange={setPrompt}
        className="mx-0 flex-1"
      />
      <Button type="submit" look="primary" size="sm">
        {t('description.aiSend')}
      </Button>
    </form>
  )
}

/** The AI's answer, formatted, under the text, with Accept and Reject. */
export function AIProposal() {
  const { t } = useTranslation('collection')
  const ai = useAI()
  // A read-only editor of its own: the proposal is never in the text until accepted.
  const preview = useMemo(() => {
    const editor = createPlateEditor({ plugins: descriptionPlugins })
    const parsed = parseMarkdown(editor, ai.proposal)
    editor.children = parsed.ok ? parsed.data : []
    return editor
  }, [ai.proposal])

  return (
    <Show when={ai.proposal || ai.busy}>
      <div
        role="group"
        aria-label={t('description.aiProposal')}
        className="mt-2 rounded-[var(--field-radius)] border border-border px-2 py-1"
      >
        <Show when={ai.proposal}>
          <Plate key={ai.proposal} editor={preview}>
            <EditorText readOnly aria-label={t('description.aiProposal')} />
          </Plate>
        </Show>
        <div className="flex min-h-8 items-center justify-end gap-2 text-xs text-muted">
          <Show when={ai.busy}>
            <span>{t('description.aiWriting')}</span>
          </Show>
          <Button look="ghost" size="sm" onPress={ai.reject}>
            {t('description.aiReject')}
          </Button>
          <Button
            look="primary"
            size="sm"
            isDisabled={ai.busy || !ai.proposal}
            onPress={ai.accept}
          >
            {t('description.aiAccept')}
          </Button>
        </div>
      </div>
    </Show>
  )
}
