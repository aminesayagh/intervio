import { useComboboxInput } from '@platejs/combobox/react'
import {
  toggleBulletedList,
  toggleNumberedList,
  toggleTaskList,
  unwrapList,
} from '@platejs/list-classic'
import { toggleCodeBlock } from '@platejs/code-block'
import { insertTable } from '@platejs/table'
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Lightbulb,
  ListCollapse,
  Pilcrow,
  Quote,
  Table,
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
import { CommandMenu } from '../../ui-kit'
import { useOptionalAI } from '../ai/aiContext'
import { TOGGLE } from './plugins'

/** A block that turns a list's line takes it out of the list first. */
const outOfList =
  (apply: (editor: SlateEditor) => void) => (editor: SlateEditor) => {
    unwrapList(editor)
    apply(editor)
  }

/**
 * The blocks "/" offers, applied to the current line (a table, three by three,
 * comes in after it, or in its place when it is empty).
 */
const blocks: [
  kind: string,
  icon: LucideIcon,
  apply: (editor: SlateEditor) => void,
][] = [
  [
    'text',
    Pilcrow,
    outOfList((editor) => editor.tf.setNodes({ type: KEYS.p })),
  ],
  ['heading1', Heading1, outOfList((editor) => editor.tf.toggleBlock(KEYS.h1))],
  ['heading2', Heading2, outOfList((editor) => editor.tf.toggleBlock(KEYS.h2))],
  ['heading3', Heading3, outOfList((editor) => editor.tf.toggleBlock(KEYS.h3))],
  ['bulleted', List, (editor) => toggleBulletedList(editor)],
  ['numbered', ListOrdered, (editor) => toggleNumberedList(editor)],
  ['todo', ListTodo, (editor) => toggleTaskList(editor)],
  [
    'toggle',
    ListCollapse,
    outOfList((editor) => editor.tf.wrapNodes({ type: TOGGLE, children: [] })),
  ],
  ['code', Code, outOfList((editor) => toggleCodeBlock(editor))],
  [
    'table',
    Table,
    (editor) => {
      // In place of an empty line, after a line with text.
      const line = editor.api.block()
      insertTable(editor, { rowCount: 3, colCount: 3 }, { select: true })
      if (line && !editor.api.string(line[1]).trim())
        editor.tf.removeNodes({ at: line[1] })
    },
  ],
  [
    'quote',
    Quote,
    outOfList((editor) =>
      // Wrapped, as Plate's own toggle sends the caret to the first block.
      editor.tf.wrapNodes({ type: KEYS.blockquote, children: [] }),
    ),
  ],
  [
    'callout',
    Lightbulb,
    outOfList((editor) =>
      editor.tf.setNodes({ type: KEYS.callout, icon: '💡' }),
    ),
  ],
]
const AI = 'ai'

/**
 * What "/" turns into (Plate's slash command): a small input where the typing
 * filters the blocks, Enter or a click turns the line into the chosen one. Escape
 * or a click away puts the typed text back as plain text; Backspace on an empty
 * input removes the "/".
 */
export function SlashInput(props: PlateElementProps) {
  const { t } = useTranslation('rich-text')
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
    // Focused once the change is drawn (before, the browser puts the caret at the
    // start of the text), where the change left the caret: followed until then.
    const caret =
      editor.selection && editor.api.pointRef(editor.selection.anchor)
    requestAnimationFrame(() => {
      const point = caret?.unref()
      if (point) editor.tf.select(point)
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
          label={t('blocks')}
          empty={t('noMatch')}
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
                    label: t('ai'),
                    icon: <Sparkles size={14} />,
                    section: t('sectionAI'),
                    keywords: t('keywords.ai'),
                  },
                ]
              : []),
            ...blocks.map(([kind, Icon]) => ({
              id: kind,
              label: t(`${kind}`),
              icon: <Icon size={14} />,
              section: t('sectionBlocks'),
              keywords: t(`keywords.${kind}`),
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
