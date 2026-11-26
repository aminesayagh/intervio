import type { SelectField } from '../../definition'
import type { ViewProps } from '../viewProps'

/**
 * A card the person moved on this board: the column it went to and the card it was
 * dropped before (null: the end). While its save runs, `record` holds it with its
 * new value, so it shows in its new column at once, before the lists reload.
 */
export type Move<T> = { to: string; before: string | null; record?: T }

/**
 * Cards dropped on a column (MAS-36): each record not in it yet takes its value,
 * through the collection's save (notifications, the server's check, the lists
 * loading again); one the person may not change is refused. `place` shows the
 * move at once and returns how to undo it, should the save fail.
 */
export function moveCards<T>(
  records: T[],
  value: string,
  group: { id: string; label: string; field: SelectField<T> },
  {
    canEdit,
    save,
    refuse,
    place,
  }: {
    canEdit: (record: T, id: string) => boolean
    save: ViewProps<T, unknown>['save']
    refuse: (record: T) => void
    place?: (moved: T) => () => void
  },
) {
  for (const record of records) {
    if (group.field.value(record) === value) continue
    if (!canEdit(record, group.id)) {
      refuse(record)
      continue
    }
    const patch = group.field.patch(value)
    const undo = place?.({ ...record, ...patch })
    // A refused or failed save is reported by save; the card goes back.
    save(record, patch, { label: group.label }).catch(() => undo?.())
  }
}

/**
 * A column's cards: its loaded records, with the board's moves applied. A card
 * moving away leaves at once, one moving in shows at once, and a moved card stays
 * where it was dropped while the board is open (the server keeps no order: on the
 * next visit it takes its place in the list's sort). Also returns how many cards
 * this adds or removes, for the column's count.
 */
export function arrange<T>(
  items: T[],
  value: string,
  moves: Map<string, Move<T>>,
  getId: (record: T) => string,
  valueOf: (record: T) => string | null,
): { cards: T[]; change: number } {
  const cards = items.filter((record) => {
    const move = moves.get(getId(record))
    return valueOf(record) === value && !(move?.record && move.to !== value)
  })
  let change = cards.length - items.length
  const present = new Set(cards.map(getId))
  for (const [id, move] of moves) {
    if (move.to !== value) continue
    if (move.record && !present.has(id)) {
      cards.push(move.record)
      change++
    }
    const from = cards.findIndex((record) => getId(record) === id)
    if (from < 0) continue
    const [card] = cards.splice(from, 1)
    const to =
      move.before === null
        ? cards.length
        : cards.findIndex((record) => getId(record) === move.before)
    // Its neighbour has gone: it stays where the list puts it.
    cards.splice(to < 0 ? from : to, 0, card)
  }
  return { cards, change }
}
