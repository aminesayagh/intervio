import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type ChatTransport, type UIMessage } from 'ai'
import {
  ClipboardList,
  FileText,
  ListChecks,
  Mail,
  Minimize2,
  Sparkles,
  SpellCheck,
  TriangleAlert,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react'
import { RangeApi } from 'platejs'
import {
  createPlateEditor,
  Plate,
  useEditorRef,
  type PlateEditor,
} from 'platejs/react'
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { csrfHeaders } from '../../http'
import { notify } from '../../notifications'
import { Button, CommandSearch, PopoverDialog, Show } from '../../ui-kit'
import { EditorText } from '../editor/PlateEditor'
import {
  richTextPlugins,
  parseMarkdown,
  serializeMarkdown,
} from '../editor/plugins'
import { AIContext, type AI, type DescriptionContext } from './aiContext'

// The backend's AI (decision 153); the tests give a simulated one (testing/simulatedAI).
const defaultTransport: ChatTransport<UIMessage> = new DefaultChatTransport({
  api: '/api/ai/description',
  headers: csrfHeaders,
  credentials: 'same-origin',
})

/** The message for what the backend answered ({"code": …} or an error chunk's code). */
function failure(error: Error) {
  const code = /ERROR_[A-Z_]+/.exec(error.message)?.[0]
  if (code === 'ERROR_AI_LIMIT') return 'aiLimit'
  if (code === 'ERROR_AI_UNAVAILABLE') return 'aiUnavailable'
  return 'aiFailed'
}

type RangeRef = ReturnType<PlateEditor['api']['rangeRef']>

/**
 * The description's AI: a free prompt about the selection (or the whole text), its
 * answer proposed under the text. Only Accept changes the text, which then saves
 * the usual way; the AI never saves by itself.
 */
export function RichTextAI({
  scope,
  transport = defaultTransport,
  children,
}: {
  /** The record's notifications scope (a failure is reported there). */
  scope: string
  transport?: ChatTransport<UIMessage>
  children: ReactNode
}) {
  const { t } = useTranslation('rich-text')
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
  // The line the requests opened under, from the "/" menu; none when closed.
  const requestAt = useRef<Element | null>(null)
  const [requesting, setRequesting] = useState(false)

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
          text: t('aiFailed'),
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
    request(at) {
      requestAt.current = at
      setRequesting(true)
    },
    proposal,
    busy: chat.status === 'submitted' || chat.status === 'streaming',
    accept() {
      const parsed = parseMarkdown(editor, proposal)
      if (!parsed.ok) {
        notify({
          tone: 'error',
          text: t('aiFailed'),
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

  // While there is a proposal, Enter accepts it and Escape drops it (or stops the
  // writing), wherever the focus is but in another field. Caught before the text
  // (no new line) and the panel (Escape doesn't close it).
  useEffect(() => {
    if (!proposal && !ai.busy) return
    function key(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      const text = editor.api.toDOMNode(editor)
      const field = target.closest('input, textarea, [contenteditable="true"]')
      if (field && !text?.contains(target)) return
      if (event.key === 'Escape') ai.reject()
      else if (event.key === 'Enter' && proposal && !ai.busy) ai.accept()
      else return
      event.preventDefault()
      event.stopPropagation()
    }
    document.addEventListener('keydown', key, true)
    return () => document.removeEventListener('keydown', key, true)
  })

  return (
    <AIContext.Provider value={ai}>
      {children}
      <Show when={requesting}>
        <PopoverDialog
          label={t('askAI')}
          width={340}
          at={{ anchor: requestAt, onClose: () => setRequesting(false) }}
        >
          <AIRequests
            onDone={(prompt) => {
              setRequesting(false)
              ai.ask(prompt)
            }}
          />
        </PopoverDialog>
      </Show>
    </AIContext.Provider>
  )
}

function useAI() {
  const ai = useContext(AIContext)
  if (!ai) throw new Error('Inside RichTextAI only')
  return ai
}

/** The toolbar's "Ask AI": a request about the selection, or the whole text. */
export function AskAIButton() {
  const { t } = useTranslation('rich-text')
  const ai = useAI()
  return (
    <PopoverDialog
      label={t('askAI')}
      width={340}
      trigger={
        <Button
          look="ghost"
          size="sm"
          aria-label={t('askAI')}
          isDisabled={ai.busy}
          className="px-2"
        >
          <Sparkles size={14} />
        </Button>
      }
    >
      {(close) => (
        <AIRequests
          onDone={(prompt) => {
            close()
            ai.ask(prompt)
          }}
        />
      )}
    </PopoverDialog>
  )
}

/** The requests offered, for managing interventions (their wording is in the locales). */
const requests: [id: string, icon: LucideIcon][] = [
  ['report', ClipboardList],
  ['summary', FileText],
  ['actions', ListChecks],
  ['client', Mail],
  ['risks', TriangleAlert],
  ['improve', WandSparkles],
  ['shorter', Minimize2],
  ['spelling', SpellCheck],
]
const FREE = 'free'

/**
 * What to ask: a field for one's own request, over the offered ones it filters.
 * Enter asks the highlighted one; with nothing offered matching, the typed request.
 */
function AIRequests({ onDone }: { onDone: (prompt: string) => void }) {
  const { t } = useTranslation('rich-text')
  const [value, setValue] = useState('')
  const typed = value.trim()
  const offered = requests.map(([id, Icon]) => ({
    id,
    label: t(`prompts.${id}.label`),
    icon: <Icon size={14} />,
  }))
  const free = {
    id: FREE,
    label: t('aiAsk', { prompt: typed }),
    icon: <Sparkles size={14} />,
    always: true,
  }

  return (
    <CommandSearch
      label={t('aiPrompt')}
      placeholder={t('aiPlaceholder')}
      empty={t('noMatch')}
      commands={typed ? [...offered, free] : offered}
      value={value}
      onChange={setValue}
      onAction={(id) => onDone(id === FREE ? typed : t(`prompts.${id}.prompt`))}
    />
  )
}

/** The AI's answer, formatted, under the text: Enter accepts it, Escape drops it. */
export function AIProposal() {
  const { t } = useTranslation('rich-text')
  const ai = useAI()
  // A read-only editor of its own: the proposal is never in the text until accepted.
  const preview = useMemo(() => {
    const editor = createPlateEditor({ plugins: richTextPlugins })
    const parsed = parseMarkdown(editor, ai.proposal)
    editor.children = parsed.ok ? parsed.data : []
    return editor
  }, [ai.proposal])
  // The proposal sits under the text, often below the panel's fold: bring it into
  // view when the AI starts writing and when it is done.
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    box.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [ai.busy])

  return (
    <Show when={ai.proposal || ai.busy}>
      <div
        ref={box}
        role="group"
        aria-label={t('aiProposal')}
        className="mt-2 rounded-[var(--field-radius)] border border-border"
      >
        <Show when={ai.proposal}>
          <Plate key={ai.proposal} editor={preview}>
            <EditorText readOnly aria-label={t('aiProposal')} />
          </Plate>
        </Show>
        <div className="flex min-h-8 items-center justify-end px-3 text-xs text-muted">
          <Show when={ai.busy} fallback={<span>{t('aiKeys')}</span>}>
            <span>{t('aiWriting')}</span>
          </Show>
        </div>
      </div>
    </Show>
  )
}
