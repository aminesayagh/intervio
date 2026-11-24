import {
  useCallback,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { notify } from '../../notifications'
import { Button, Match, Show, Switch } from '../../ui-kit'
import { ErrorText } from '../parts'
import {
  EditorText,
  PlateEditor,
  type MarkdownFailure,
} from './description/PlateEditor'
import { Toolbar } from './description/Toolbar'
import { useAutosave } from './useAutosave'

/** The longest description accepted (spec 7.6), in Markdown characters. */
const MAX_LENGTH = 20_000

/**
 * A record's description in the panel (spec 7.6, decision 146): shown in its editor
 * from the start, formatted. With the right to change it, the person writes in it
 * directly; it saves by itself a moment after typing stops, and keeps unsaved text in
 * the browser tab. Without the right, the same editor is read-only.
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
  /** Its name, when it is not the description (a rich text value, spec 7.3.0). */
  label?: string
  /** Where the tab keeps text not saved yet (spec 6.1). */
  storageKey: string
  /** The record's notifications scope (a failure is reported there). */
  scope: string
  save: (text: string) => Promise<void>
}) {
  const { t } = useTranslation('collection')
  if (!value && !editable) return null
  return (
    <Editor
      initial={value}
      editable={editable}
      label={label ?? t('description.label')}
      storageKey={storageKey}
      scope={scope}
      save={save}
    />
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

function Editor({
  initial,
  editable,
  label,
  storageKey,
  scope,
  save,
}: {
  initial: string
  editable: boolean
  label: string
  storageKey: string
  scope: string
  save: (text: string) => Promise<void>
}) {
  const { t } = useTranslation('collection')
  const [text, setText] = useState(() =>
    editable ? (read(storageKey) ?? initial) : initial,
  )
  // The text the record holds: the same text again is never sent.
  const saved = useRef(initial)
  const autosave = useAutosave(async (next) => {
    if (next !== saved.current) await save(next)
    saved.current = next
    keep(storageKey, null) // saved: nothing left to keep
  })
  const tooLong = text.length > MAX_LENGTH

  // The toolbar shows while the cursor is in the description (its link field, in a
  // popover outside the page's flow, counts as inside: React's focus events reach
  // here from it). Leaving saves at once.
  const [cursorIn, setCursorIn] = useState(false)
  const inside = useRef(false)
  const area = useRef<HTMLElement>(null)
  function onFocus(event: FocusEvent) {
    inside.current = event.target !== event.currentTarget
    setCursorIn(inside.current)
  }
  function onBlur() {
    inside.current = false
    setTimeout(() => {
      if (inside.current) return // focus moved within: the toolbar, its link field
      setCursorIn(false)
      void autosave.flush()
    })
  }
  // Escape leaves the text: the focus goes back to the description itself. (In the
  // link's popover, outside this element on the page, Escape only closes it.)
  function onKeyDown(event: KeyboardEvent) {
    const fromHere = area.current?.contains(event.target as Node)
    if (event.key !== 'Escape' || !fromHere) return
    event.preventDefault()
    area.current?.focus()
  }

  function change(next: string) {
    setText(next)
    keep(storageKey, next)
    if (next.length <= MAX_LENGTH) autosave.change(next)
  }

  // Text Plate can't read is shown as it is, read-only; text it can't write is never
  // saved, nor half saved. Either way, a notification says so.
  const fail = useCallback(
    (failure: MarkdownFailure) =>
      notify({
        tone: 'error',
        text: t(
          failure === 'parse'
            ? 'description.unreadable'
            : 'description.unwritable',
        ),
        scope,
        key: `${storageKey}:markdown`,
      }),
    [t, scope, storageKey],
  )

  return (
    <section
      ref={area}
      tabIndex={-1}
      aria-label={label}
      onFocus={onFocus}
      onBlur={onBlur}
      // Captured: Plate's own Escape handling stops the key before it bubbles here.
      onKeyDownCapture={onKeyDown}
      className="flex flex-col outline-none"
    >
      <PlateEditor
        initial={text}
        onChange={change}
        onFailure={fail}
        fallback={
          <>
            <h3 className="mb-1 text-muted">{label}</h3>
            <p className="break-words whitespace-pre-wrap">{initial}</p>
          </>
        }
      >
        <div className="mb-1 flex min-h-8 items-center gap-2">
          <h3 className="text-muted">{label}</h3>
          <Show when={editable && cursorIn} className="ms-auto">
            <Toolbar scope={scope} />
          </Show>
        </div>
        <EditorText
          aria-label={label}
          aria-invalid={tooLong || undefined}
          readOnly={!editable}
          placeholder={t('description.add')}
        />
      </PlateEditor>
      <Show when={editable}>
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
      </Show>
    </section>
  )
}
