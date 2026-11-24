import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Button,
  cn,
  Match,
  Show,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '../../ui-kit'
import { notify } from '../../notifications'
import { ErrorText } from '../parts'
import {
  EditorText,
  PlateEditor,
  type MarkdownFailure,
} from './description/PlateEditor'
import { Toolbar } from './description/Toolbar'
import { useAutosave } from './useAutosave'

/** The longest description accepted (spec 7.6). */
const MAX_LENGTH = 20_000

/**
 * Markdown, formatted: headings, lists, check lists, tables, links (new tab). Raw HTML
 * is never rendered.
 */
export function MarkdownView({ text }: { text: string }) {
  return (
    <div
      className={cn(
        'min-w-0 break-words [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-3 [&_blockquote]:text-muted',
        '[&_code]:rounded-[var(--field-radius)] [&_code]:bg-default [&_code]:px-1 [&_h1]:text-lg [&_h1]:font-medium [&_h2]:text-base [&_h2]:font-medium [&_h3]:font-medium',
        '[&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5 [&_ul:has(input)]:list-none [&_ul:has(input)]:ps-0',
        '[&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-start',
        '[&>*+*]:mt-2',
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

/**
 * A record's description in the panel (spec 7.6): shown formatted; when the person
 * may change it, a click (or Enter) opens the editor in place. The editor saves by
 * itself a moment after typing stops, and keeps unsaved text in the browser tab.
 */
export function Description({
  value,
  editable,
  storageKey,
  scope,
  save,
  label,
}: {
  value: string
  editable: boolean
  /** The record's notifications scope (a failure is reported there). */
  scope: string
  /** Its name, when it is not the description (a rich text value, spec 7.3.0). */
  label?: string
  /** Where the tab keeps text not saved yet (spec 6.1). */
  storageKey: string
  save: (text: string) => Promise<void>
}) {
  const { t } = useTranslation('collection')
  const [editing, setEditing] = useState(false)
  const name = label ?? t('description.label')

  if (!value && !editable) return null
  return (
    <section>
      <h3 className="mb-1 text-muted">{name}</h3>
      <Switch>
        <Match when={editing}>
          <Editor
            initial={value}
            label={name}
            storageKey={storageKey}
            scope={scope}
            save={save}
            onLeave={() => setEditing(false)}
          />
        </Match>
        <Match when={editable}>
          <div
            role="button"
            tabIndex={0}
            aria-label={
              label
                ? t('description.editLabel', { label })
                : t('description.edit')
            }
            onClick={() => setEditing(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setEditing(true)
            }}
            className="-mx-2 cursor-text rounded-[var(--field-radius)] px-2 py-1 outline-none hover:bg-default focus-visible:bg-default"
          >
            <Show
              when={value}
              fallback={<p className="text-muted">{t('description.add')}</p>}
            >
              <MarkdownView text={value} />
            </Show>
          </div>
        </Match>
        <Match when={true}>
          <MarkdownView text={value} />
        </Match>
      </Switch>
    </section>
  )
}

function read(key: string) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}
function keep(key: string, text: string | null) {
  try {
    if (text === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, text)
  } catch {
    // storage blocked: the text stays in the editor only
  }
}

/** The description edited formatted: Write and Preview, a small toolbar, saved by itself. */
function Editor({
  initial,
  storageKey,
  scope,
  save,
  onLeave,
  label,
}: {
  label: string
  initial: string
  storageKey: string
  scope: string
  save: (text: string) => Promise<void>
  onLeave: () => void
}) {
  const { t } = useTranslation('collection')
  const [text, setText] = useState(() => read(storageKey) ?? initial)
  // The text the record holds: the same text again is never sent.
  const saved = useRef(initial)
  const autosave = useAutosave(async (next) => {
    if (next !== saved.current) await save(next)
    saved.current = next
    keep(storageKey, null) // saved: nothing left to keep
  })
  const tooLong = text.length > MAX_LENGTH

  function change(next: string) {
    setText(next)
    keep(storageKey, next)
    if (next.length <= MAX_LENGTH) autosave.change(next)
  }

  // Text Plate can't read or write is never saved, nor half saved: it says so.
  const fail = useCallback(
    (failure: MarkdownFailure) => {
      notify({
        tone: 'error',
        text: t(
          failure === 'parse'
            ? 'description.unreadable'
            : 'description.unwritable',
        ),
        scope,
        key: `${storageKey}:markdown`,
      })
      if (failure === 'parse') onLeave()
    },
    [t, scope, storageKey, onLeave],
  )

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      void autosave.flush()
      onLeave()
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <PlateEditor initial={text} onChange={change} onFailure={fail}>
        <Tabs>
          <div className="flex items-center gap-2 border-b border-border">
            <TabList aria-label={label}>
              {(['write', 'preview'] as const).map((id) => (
                <Tab key={id} id={id}>
                  {t(`description.${id}`)}
                </Tab>
              ))}
            </TabList>
            <Toolbar scope={scope} />
          </div>
          <TabPanel id="write">
            {/* On a wrapper: Slate passes these on only once its own checks pass. */}
            <div onBlur={() => void autosave.flush()} onKeyDown={onKeyDown}>
              <EditorText
                autoFocus
                aria-label={label}
                aria-invalid={tooLong || undefined}
              />
            </div>
          </TabPanel>
          <TabPanel id="preview" className="pt-2">
            <Show
              when={text}
              fallback={<p className="text-muted">{t('description.empty')}</p>}
            >
              <MarkdownView text={text} />
            </Show>
          </TabPanel>
        </Tabs>
      </PlateEditor>
      <div
        aria-live="polite"
        className="flex min-h-6 items-center justify-end gap-2 text-xs text-muted"
      >
        <Switch>
          <Match when={tooLong}>
            <ErrorText>{t('description.tooLong')}</ErrorText>
          </Match>
          <Match when={autosave.status === 'failed'}>
            <ErrorText className="flex items-center gap-2">
              {t('description.failed')}
              <Button
                look="ghost"
                size="sm"
                onPress={() => void autosave.retry()}
              >
                {t('error.retry')}
              </Button>
            </ErrorText>
          </Match>
          <Match when={autosave.status === 'saving'}>
            <span>{t('description.saving')}</span>
          </Match>
          <Match when={autosave.status === 'saved'}>
            <span>{t('description.saved')}</span>
          </Match>
        </Switch>
      </div>
    </div>
  )
}
