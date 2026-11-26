import {
  convertNodesSerialize,
  defaultRules,
  serializeMd,
  type MdRules,
} from '@platejs/markdown'
import { PathApi, type TElement, type Value } from 'platejs'
import { createPlatePlugin } from 'platejs/react'
import { ImageElement, ToggleElement } from './elements'

/** Markdown's images: kept where they are in their line and shown, never added (#36). */
const IMAGE = 'mdImage'
export const ImagePlugin = createPlatePlugin({
  key: IMAGE,
  node: { isElement: true, isInline: true, isVoid: true },
}).withComponent(ImageElement)

/**
 * A toggle: its first block is the title, the others its content, folded away by the
 * title's triangle. Enter on an empty last line of the content leaves the toggle;
 * Backspace at the start of the title turns it back into plain blocks.
 */
export const TOGGLE = 'toggle'
export const TogglePlugin = createPlatePlugin({
  key: TOGGLE,
  node: { isElement: true },
})
  .withComponent(ToggleElement)
  .overrideEditor(({ editor, tf: { insertBreak, deleteBackward } }) => {
    /** The toggle around the cursor's block, and that block's place in it. */
    const inToggle = () => {
      const toggle = editor.api.above<TElement>({ match: { type: TOGGLE } })
      const block = editor.api.block()
      if (!toggle || !block || block[1].length !== toggle[1].length + 1) return
      return { toggle, block, index: block[1].at(-1)! }
    }
    return {
      transforms: {
        insertBreak() {
          const at = inToggle()
          if (
            at &&
            at.index > 0 &&
            at.index === at.toggle[0].children.length - 1 &&
            editor.api.isEmpty(at.block[0])
          )
            return editor.tf.moveNodes({
              at: at.block[1],
              to: PathApi.next(at.toggle[1]),
            })
          insertBreak()
        },
        deleteBackward(unit) {
          const at = inToggle()
          if (
            at?.index === 0 &&
            editor.api.isStart(editor.selection?.anchor, at.block[1])
          )
            return editor.tf.unwrapNodes({ at: at.toggle[1] })
          deleteBackward(unit)
        },
      },
    }
  })

type MdItem = { checked?: boolean | null }
export type Block = TElement & { [prop: string]: unknown }

/** The callout's saved attributes (Plate's own tag): its icon and variant. */
const attributes = (node: Block) =>
  (['icon', 'variant'] as const)
    .filter((name) => typeof node[name] === 'string')
    .map((name) => ` ${name}="${String(node[name]).replace(/"/g, '&quot;')}"`)
    .join('')

/**
 * The Markdown conversions Plate's own don't cover: a checklist ("- [x]") as a to-do
 * list, ticks kept (#38); an image as an inline image (#36).
 */
export const rules: MdRules = {
  list: {
    deserialize: (mdast, deco, options) => {
      const list = defaultRules.list!.deserialize!(mdast, deco, options)
      const items = mdast.children as MdItem[]
      if (!items.some((item) => typeof item.checked === 'boolean')) return list
      return {
        ...list,
        type: 'taskList',
        children: list.children.map((li: object, i: number) => ({
          ...li,
          checked: !!items[i]?.checked,
        })),
      }
    },
  },
  taskList: {
    serialize: (node, options) => {
      const list = defaultRules.list!.serialize!(node, options)
      list.children.forEach((item: MdItem, i: number) => {
        item.checked = !!node.children[i]?.checked
      })
      return list
    },
  },
  // Plate's own tag, inline in its paragraph: <callout icon="💡">Text</callout>.
  callout: {
    serialize: (node, options) => ({
      type: 'paragraph',
      children: [
        { type: 'html', value: `<callout${attributes(node as Block)}>` },
        ...convertNodesSerialize(node.children, options),
        { type: 'html', value: '</callout>' },
      ],
    }),
  },
  // HTML's folding block: <details><summary>Title</summary> content </details>.
  [TOGGLE]: {
    serialize: (node, options) => {
      const [title, ...content] = node.children as Value
      const md = (value: Value) =>
        serializeMd(options.editor!, { value }).replace(/\n+$/, '')
      return {
        type: 'html',
        value: `<details>\n<summary>${md([title])}</summary>\n\n${content.length ? `${md(content)}\n\n` : ''}</details>`,
      }
    },
  },
  img: {
    deserialize: (mdast) => ({
      type: IMAGE,
      url: mdast.url,
      alt: mdast.alt ?? '',
      title: mdast.title,
      children: [{ text: '' }],
    }),
  },
  [IMAGE]: {
    serialize: (node) => ({
      type: 'image',
      url: node.url,
      alt: node.alt,
      title: node.title,
    }),
  },
}
