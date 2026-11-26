import {
  flip,
  offset,
  useFloatingToolbar,
  useFloatingToolbarState,
} from '@platejs/floating'
import { upsertLink } from '@platejs/link'
import { toggleBulletedList, toggleNumberedList } from '@platejs/list-classic'
import {
  Bold,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  type LucideIcon,
} from 'lucide-react'
import { KEYS, type SlateEditor } from 'platejs'
import { useEditorId, useEditorRef, useEventEditorValue } from 'platejs/react'
import { useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { notify } from '../../notifications'
import { Button, PopoverDialog, Show, TextInput } from '../../ui-kit'
import { AskAIButton } from '../ai/AskAI'

/** The six formats of spec 7.6, each applied to the editor's selection. */
const tools: [
  kind: 'bold' | 'italic' | 'heading' | 'list' | 'numbered',
  icon: LucideIcon,
  apply: (editor: SlateEditor) => void,
][] = [
  ['bold', Bold, (editor) => editor.tf.toggleMark(KEYS.bold)],
  ['italic', Italic, (editor) => editor.tf.toggleMark(KEYS.italic)],
  ['heading', Heading, (editor) => editor.tf.toggleBlock(KEYS.h2)],
  ['list', List, (editor) => toggleBulletedList(editor)],
  ['numbered', ListOrdered, (editor) => toggleNumberedList(editor)],
]

/**
 * The editor's tools over the selected text (Plate's floating toolbar): they apply
 * to that part only. Kept open while its link or AI panel is in use (their popovers
 * carry Plate's ignore class).
 */
export function FloatingToolbar({ scope }: { scope: string }) {
  const state = useFloatingToolbarState({
    editorId: useEditorId(),
    focusedEditorId: useEventEditorValue('focus'),
    floatingOptions: {
      placement: 'top',
      strategy: 'fixed',
      middleware: [offset(8), flip({ padding: 12 })],
    },
  })
  const { clickOutsideRef, hidden, props, ref } = useFloatingToolbar(state)

  // Over the page, so the panel's scrolling edge never cuts it. The fade sits
  // inside the placed box: its transform would otherwise move the fixed position.
  return createPortal(
    <div ref={clickOutsideRef}>
      <div ref={ref} {...props} className="z-50">
        <Show when={!hidden}>
          <div
            role="toolbar"
            className="flex rounded-[var(--field-radius)] border border-border bg-surface p-0.5 text-sm shadow-md"
          >
            <Tools scope={scope} />
          </div>
        </Show>
      </div>
    </div>,
    document.body,
  )
}

/**
 * The tools. Their buttons keep the focus in the text (`preventFocusOnPress`), so
 * the selection they format stays where it was.
 */
function Tools({ scope }: { scope: string }) {
  const { t } = useTranslation('rich-text')
  const editor = useEditorRef()

  return (
    <>
      <AskAIButton />
      {tools.map(([kind, Icon, apply]) => (
        <Button
          key={kind}
          look="ghost"
          size="sm"
          preventFocusOnPress
          aria-label={t(`${kind}`)}
          onPress={() => apply(editor)}
          className="px-2"
        >
          <Icon size={14} />
        </Button>
      ))}
      <PopoverDialog
        label={t('link')}
        trigger={
          <Button
            look="ghost"
            size="sm"
            aria-label={t('link')}
            className="px-2"
          >
            <Link size={14} />
          </Button>
        }
      >
        {(close) => (
          <LinkForm
            onDone={(url) => {
              close()
              editor.tf.focus()
              if (!upsertLink(editor, { url }))
                notify({
                  text: t('linkInvalid'),
                  tone: 'error',
                  key: `${scope}:link`,
                  scope,
                })
            }}
          />
        )}
      </PopoverDialog>
    </>
  )
}

/** The link's address, added over the selection (or as its own text). */
function LinkForm({ onDone }: { onDone: (url: string) => void }) {
  const { t } = useTranslation('rich-text')
  const [url, setUrl] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (url.trim()) onDone(url.trim())
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <TextInput
        look="panel"
        autoFocus
        aria-label={t('linkUrl')}
        placeholder="https://example.com"
        value={url}
        onChange={setUrl}
        className="mx-0 flex-1"
      />
      <Button type="submit" look="primary" size="sm">
        {t('linkAdd')}
      </Button>
    </form>
  )
}
