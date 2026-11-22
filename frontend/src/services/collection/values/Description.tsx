import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn, Icon, Match, Show, Switch } from '../../ui-kit'
import { Button, ErrorText } from '../parts'
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
  save,
}: {
  value: string
  editable: boolean
  /** Where the tab keeps text not saved yet (spec 6.1). */
  storageKey: string
  save: (text: string) => Promise<void>
}) {
  const { t } = useTranslation('collection')
  const [editing, setEditing] = useState(false)

  if (!value && !editable) return null
  return (
    <section>
      <h3 className="mb-1 text-muted">{t('description.label')}</h3>
      <Switch>
        <Match when={editing}>
          <Editor
            initial={value}
            storageKey={storageKey}
            save={save}
            onLeave={() => setEditing(false)}
          />
        </Match>
        <Match when={editable}>
          <div
            role="button"
            tabIndex={0}
            aria-label={t('description.edit')}
            onClick={() => setEditing(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setEditing(true)
            }}
            className="group/edit relative -mx-2 cursor-text rounded-[var(--field-radius)] px-2 py-1 pe-8 outline-none hover:bg-default focus-visible:bg-default"
          >
            <Show
              when={value}
              fallback={<p className="text-muted">{t('description.add')}</p>}
            >
              <MarkdownView text={value} />
            </Show>
            <span className="pointer-events-none absolute end-2 top-1.5 flex text-muted opacity-0 group-hover/edit:opacity-100 group-focus-visible/edit:opacity-100">
              <Icon name="lucide/pencil" size={14} />
            </span>
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

/** Markdown typed in place: Write and Preview, a small toolbar, saved by itself. */
function Editor({
  initial,
  storageKey,
  save,
  onLeave,
}: {
  initial: string
  storageKey: string
  save: (text: string) => Promise<void>
  onLeave: () => void
}) {
  const { t } = useTranslation('collection')
  const [text, setText] = useState(() => read(storageKey) ?? initial)
  const field = useRef<HTMLTextAreaElement>(null)
  const autosave = useAutosave(async (next) => {
    await save(next)
    keep(storageKey, null) // saved: nothing left to keep
  })
  const tooLong = text.length > MAX_LENGTH

  // The field appears with the cursor after the text, ready to add to it. (A callback
  // ref: React Aria's tab panel mounts its content a render later than the editor.)
  const placeField = useCallback((element: HTMLTextAreaElement | null) => {
    field.current = element
    element?.setSelectionRange(element.value.length, element.value.length)
  }, [])

  function change(next: string) {
    setText(next)
    keep(storageKey, next)
    if (next.length <= MAX_LENGTH) autosave.change(next)
  }

  /** Wraps the selection in Markdown, or starts its line with a marker. */
  function format(
    kind: 'bold' | 'italic' | 'heading' | 'list' | 'numbered' | 'link',
  ) {
    const element = field.current
    if (!element) return
    const { selectionStart: start, selectionEnd: end, value } = element
    const chosen = value.slice(start, end)
    let next: string
    let cursor = end
    if (kind === 'bold' || kind === 'italic') {
      const mark = kind === 'bold' ? '**' : '_'
      next = value.slice(0, start) + mark + chosen + mark + value.slice(end)
      cursor = end + mark.length * 2
    } else if (kind === 'link') {
      const label = chosen || t('description.linkText')
      next = `${value.slice(0, start)}[${label}](https://)${value.slice(end)}`
      cursor = start + label.length + 11
    } else {
      const marker = kind === 'heading' ? '## ' : kind === 'list' ? '- ' : '1. '
      const line = value.lastIndexOf('\n', start - 1) + 1
      next = value.slice(0, line) + marker + value.slice(line)
      cursor = end + marker.length
    }
    change(next)
    requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(cursor, cursor)
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      void autosave.flush()
      onLeave()
    }
  }

  const tools = [
    ['bold', 'B'],
    ['italic', 'I'],
    ['heading', 'H'],
    ['list', '•'],
    ['numbered', '1.'],
    ['link', t('description.link')],
  ] as const

  return (
    <div className="flex flex-col gap-1">
      <Tabs>
        <div className="flex items-center gap-2 border-b border-border">
          <TabList aria-label={t('description.label')} className="flex gap-4">
            {(['write', 'preview'] as const).map((id) => (
              <Tab
                key={id}
                id={id}
                className="-mb-px cursor-pointer border-b-2 border-transparent py-1.5 text-muted outline-none data-[focus-visible]:text-foreground data-[selected]:border-foreground data-[selected]:text-foreground"
              >
                {t(`description.${id}`)}
              </Tab>
            ))}
          </TabList>
          <div className="ms-auto flex">
            {tools.map(([kind, label]) => (
              <Button
                key={kind}
                look="ghost"
                size="sm"
                aria-label={t(`description.${kind}`)}
                onPress={() => format(kind)}
                className="px-2"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <TabPanel id="write" className="outline-none">
          <textarea
            ref={placeField}
            autoFocus
            aria-label={t('description.label')}
            aria-invalid={tooLong || undefined}
            value={text}
            rows={Math.max(4, text.split('\n').length + 1)}
            onChange={(event) => change(event.target.value)}
            onBlur={() => void autosave.flush()}
            onKeyDown={onKeyDown}
            className="mt-2 w-full resize-none rounded-[var(--field-radius)] border border-border bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
          />
        </TabPanel>
        <TabPanel id="preview" className="pt-2 outline-none">
          <Show
            when={text}
            fallback={<p className="text-muted">{t('description.empty')}</p>}
          >
            <MarkdownView text={text} />
          </Show>
        </TabPanel>
      </Tabs>
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
