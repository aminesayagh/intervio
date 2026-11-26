import {
  BlockquotePlugin,
  BoldPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
} from '@platejs/basic-nodes/react'
import { CalloutPlugin } from '@platejs/callout/react'
import { DndPlugin } from '@platejs/dnd'
import { CodeBlockPlugin, CodeSyntaxPlugin } from '@platejs/code-block/react'
import { LinkPlugin } from '@platejs/link/react'
import { ListItemPlugin, ListPlugin } from '@platejs/list-classic/react'
import { MarkdownPlugin } from '@platejs/markdown'
import { SlashInputPlugin, SlashPlugin } from '@platejs/slash-command/react'
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from '@platejs/table/react'
import { KEYS, PathApi, type TElement } from 'platejs'
import { common, createLowlight } from 'lowlight'
import remarkGfm from 'remark-gfm'
import {
  CalloutElement,
  CodeBlockElement,
  CodeSyntaxLeaf,
  ListItemElement,
  TableElement,
  TableCellElement,
  TableHeaderCellElement,
  TableRowElement,
} from './elements'
import { DragArea, Draggable } from './dnd'
import { LinkElement } from './LinkElement'
import { SlashInput } from './SlashInput'
import { ImagePlugin, rules, TogglePlugin } from './blocks'

/**
 * The description editor's plugins: the toolbar's features of spec 7.6 (bold, italic,
 * heading, bullet list, numbered list, link), the blocks "/" adds (to-do list, toggle,
 * code block, table, blockquote, callout), and Markdown in and out. Headings have three levels ("/" offers each; the toolbar's is
 * level 2). "/" at the start of a word opens the menu of blocks (never saved: it leaves
 * the text when closed).
 */
export const richTextPlugins = [
  BoldPlugin,
  ItalicPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ListPlugin,
  BlockquotePlugin,
  // Highlighted in its language (the common ones), guessed when none is chosen; Enter
  // on an empty last line leaves it (as the toggle).
  CodeBlockPlugin.configure({
    options: { lowlight: createLowlight(common), defaultLanguage: 'auto' },
  })
    .withComponent(CodeBlockElement)
    .overrideEditor(({ editor, tf: { insertBreak } }) => ({
      transforms: {
        insertBreak() {
          const code = editor.api.above<TElement>({
            match: { type: KEYS.codeBlock },
          })
          const line = editor.api.block()
          if (
            code &&
            line &&
            code[0].children.length > 1 &&
            line[1].at(-1) === code[0].children.length - 1 &&
            editor.api.isEmpty(line[0])
          ) {
            editor.tf.removeNodes({ at: line[1] })
            editor.tf.insertNodes(
              { type: KEYS.p, children: [{ text: '' }] },
              { at: PathApi.next(code[1]), select: true },
            )
            return
          }
          insertBreak()
        },
      },
    })),
  CodeSyntaxPlugin.withComponent(CodeSyntaxLeaf),
  TablePlugin.withComponent(TableElement),
  TableRowPlugin.withComponent(TableRowElement),
  TableCellPlugin.withComponent(TableCellElement),
  TableCellHeaderPlugin.withComponent(TableHeaderCellElement),
  CalloutPlugin.withComponent(CalloutElement),
  TogglePlugin,
  // A to-do list's items with their checkbox; the others as they are.
  ListItemPlugin.withComponent(ListItemElement),
  ImagePlugin,
  LinkPlugin.withComponent(LinkElement),
  DndPlugin.configure({
    render: { aboveNodes: Draggable, aboveSlate: DragArea },
  }),
  // Never in code, where "/" is code.
  SlashPlugin.configure({
    options: {
      triggerQuery: (editor) =>
        !editor.api.some({ match: { type: KEYS.codeBlock } }),
    },
  }),
  SlashInputPlugin.withComponent(SlashInput),
  MarkdownPlugin.configure({
    options: {
      remarkPlugins: [remarkGfm],
      rules,
      // The marks the former Markdown toolbar wrote, so saved texts keep their look.
      remarkStringifyOptions: { bullet: '-', emphasis: '_', strong: '*' },
    },
  }),
]
