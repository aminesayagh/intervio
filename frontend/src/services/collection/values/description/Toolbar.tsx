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
import { useEditorRef } from 'platejs/react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { notify } from '../../../notifications'
import { Button, PopoverDialog, TextInput } from '../../../ui-kit'
import { AskAIButton } from './AskAI'

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
 * The description editor's toolbar. Its buttons keep the focus in the text
 * (`preventFocusOnPress`), so the selection they format stays where it was.
 */
export function Toolbar({ scope }: { scope: string }) {
  const { t } = useTranslation('collection')
  const editor = useEditorRef()

  return (
    <div className="ms-auto flex">
      {tools.map(([kind, Icon, apply]) => (
        <Button
          key={kind}
          look="ghost"
          size="sm"
          preventFocusOnPress
          aria-label={t(`description.${kind}`)}
          onPress={() => apply(editor)}
          className="px-2"
        >
          <Icon size={14} />
        </Button>
      ))}
      <PopoverDialog
        label={t('description.link')}
        trigger={
          <Button
            look="ghost"
            size="sm"
            aria-label={t('description.link')}
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
                  text: t('description.linkInvalid'),
                  tone: 'error',
                  key: `${scope}:link`,
                  scope,
                })
            }}
          />
        )}
      </PopoverDialog>
      <AskAIButton />
    </div>
  )
}

/** The link's address, added over the selection (or as its own text). */
function LinkForm({ onDone }: { onDone: (url: string) => void }) {
  const { t } = useTranslation('collection')
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
        aria-label={t('description.linkUrl')}
        placeholder="https://example.com"
        value={url}
        onChange={setUrl}
        className="mx-0 flex-1"
      />
      <Button type="submit" look="primary" size="sm">
        {t('description.linkAdd')}
      </Button>
    </form>
  )
}
