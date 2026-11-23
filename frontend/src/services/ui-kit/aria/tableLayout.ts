import {
  TableLayout as AriaTableLayout,
  type Rect,
} from 'react-aria-components'
// Types only (the same version React Aria uses): its layout's nodes.
import type { GridNode } from 'react-stately/private/grid/GridCollection'
import type { LayoutNode } from 'react-stately/useVirtualizerState'

/**
 * React Aria's table layout, for columns of fixed widths that scroll sideways (spec 9):
 * - it lays the rows out again only when the visible height changes. Its default also
 *   does when the width changes (the panel opens or closes), and then every visible
 *   row renders again (about 200 ms in a production build); with fixed widths a
 *   narrower window shows the same rows, so there is nothing to lay out again;
 * - the selection checkbox and the first column (the row header, the record's name)
 *   stay pinned on the left while the others scroll under them.
 */
export class TableLayout<T> extends AriaTableLayout<T> {
  shouldInvalidate(newRect: Rect, oldRect: Rect) {
    return newRect.height !== oldRect.height
  }

  /** Pinned: every column up to the row header (the checkbox, then the name). */
  protected isStickyColumn(node: GridNode<T>) {
    const index = node.colIndex ?? node.index
    const columns = this.collection.columns
    const header = columns.findIndex((column) =>
      this.collection.rowHeaderColumnKeys.has(column.key),
    )
    return index <= Math.max(header, 0)
  }

  /*
   * The header and the rows' group let pinned cells stick to the scrolling table:
   * React Aria clips them (`overflow: hidden`), and a sticky cell inside a clipped box
   * sticks to that box, which doesn't scroll.
   */
  protected buildTableHeader(): LayoutNode {
    return unclipped(super.buildTableHeader())
  }
  protected buildRowGroup(y: number, node: GridNode<T>): LayoutNode {
    return unclipped(super.buildRowGroup(y, node))
  }
}

function unclipped(node: LayoutNode) {
  node.layoutInfo.allowOverflow = true
  return node
}
