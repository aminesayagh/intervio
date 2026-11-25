import { useComboboxInput } from '@platejs/combobox/react'
import {
  toggleBulletedList,
  toggleNumberedList,
  toggleTaskList,
} from '@platejs/list-classic'
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Pilcrow,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { KEYS, type SlateEditor } from 'platejs'
import { PlateElement, type PlateElementProps } from 'platejs/react'
import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { CommandMenu } from '../../../ui-kit'
import { useOptionalAI } from './aiContext'

/** The blocks "/" offers: the editor's own (spec 7.6), applied to the current line. */
const blocks: [
  kind: string,
  icon: LucideIcon,
  apply: (editor: SlateEditor) => void,
][] = [
  ['text', Pilcrow, (editor) => editor.tf.setNodes({ type: KEYS.p })],
  ['heading1', Heading1, (editor) => editor.tf.toggleBlock(KEYS.h1)],
  ['heading2', Heading2, (editor) => editor.tf.toggleBlock(KEYS.h2)],
  ['heading3', Heading3, (editor) => editor.tf.toggleBlock(KEYS.h3)],
  ['bulleted', List, (editor) => toggleBulletedList(editor)],
  ['numbered', ListOrdered, (editor) => toggleNumberedList(editor)],
  ['todo', ListTodo, (editor) => toggleTaskList(editor)],
]
const AI = 'ai'

/**
 * What "/" turns into (Plate's slash command): a small input where the typing
 * filters the blocks, Enter or a click turns the line into the chosen one. Escape
 * or a click away puts the typed text back as plain text; Backspace on an empty
 * input removes the "/".
 */
export function SlashInput(props: PlateElementProps) {
  const { t } = useTranslation('collection')
  const { editor, element } = props
  const ai = useOptionalAI()
  // Where the typed text goes back if the menu is left: just before the "/".
  const [at] = useState(() => {
    const point = editor.api.before(editor.api.findPath(element) ?? [])
    return point ? editor.api.pointRef(point) : null
  })
  useEffect(() => () => void at?.unref(), [at])
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const anchor = useRef<HTMLSpanElement>(null)
  // Escape, Backspace and blur are handled here, not by Plate: its own refocuses
  // the editor before the caret is placed (the editor lost its selection to the
  // menu), and the menu's highlight sends the input pretend blurs (React Aria's
  // virtual focus).
  const { removeInput } = useComboboxInput({
    ref: inputRef,
    cancelInputOnBlur: false,
    cancelInputOnEscape: false,
    cancelInputOnBackspace: false,
    cancelInputOnArrowLeftRight: false,
  })

  // Closed once: removing the focused input blurs it, which is no leaving.
  const closed = useRef(false)

  /** Closes the menu and does `then` where it was, the caret staying there. */
  function close(then: () => void) {
    closed.current = true
    removeInput()
    if (at?.current) editor.tf.select(at.current)
    then()
    // Focused once the change is drawn: before, the browser puts the caret at the
    // start of the text.
    const caret = editor.selection
    requestAnimationFrame(() => {
      if (caret) editor.tf.select(caret)
      editor.tf.focus()
    })
  }
  function cancel(keepText: boolean) {
    close(() => {
      if (keepText) editor.tf.insertText(`/${value}`)
    })
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') cancel(true)
    else if (event.key === 'Backspace' && !value) cancel(false)
    else return
    event.preventDefault()
  }
  function blurred(event: FocusEvent<HTMLInputElement>) {
    // A real blur only: the focus has gone elsewhere, where it stays.
    if (!closed.current && document.activeElement !== event.currentTarget) {
      closed.current = true
      removeInput()
      editor.tf.insertText(`/${value}`, { at: at?.current ?? undefined })
    }
  }

  return (
    <PlateElement {...props} as="span">
      <span ref={anchor} contentEditable={false} className="text-muted">
        /{value}
        <CommandMenu
          anchor={anchor}
          label={t('description.blocks')}
          empty={t('description.noMatch')}
          value={value}
          onChange={setValue}
          inputRef={inputRef}
          inputProps={{ onKeyDown: keyDown, onBlur: blurred }}
          commands={[
            // Its requests, about the whole text, open under the line (decision 160).
            ...(ai
              ? [
                  {
                    id: AI,
                    label: t('description.ai'),
                    icon: <Sparkles size={14} />,
                    section: t('description.sectionAI'),
                  },
                ]
              : []),
            ...blocks.map(([kind, Icon]) => ({
              id: kind,
              label: t(`description.${kind}`),
              icon: <Icon size={14} />,
              section: t('description.sectionBlocks'),
            })),
          ]}
          onAction={(id) => {
            close(() => blocks.find(([kind]) => kind === id)?.[2](editor))
            if (id !== AI || !ai) return
            // After the caret is back (close's own frame): then the requests take it.
            requestAnimationFrame(() => {
              const line = editor.api.block()
              const node = line && editor.api.toDOMNode(line[0])
              if (node) ai.request(node)
            })
          }}
        />
      </span>
      {props.children}
    </PlateElement>
  )
}
