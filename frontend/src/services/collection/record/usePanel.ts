import { useCallback } from 'react'
import {
  currentAddress,
  currentSearch,
  entryState,
  navigate,
  useQueryStates,
} from '../../navigation'
import { panelAddress, panelParsers, readPanel } from '../address'
import type { Id } from '../types'
import type { Step } from './linked'

/**
 * The panel's parameters as the address has them now. The panel's callbacks read them
 * when they run, not from the last render: one click can call them several times
 * before a render (a row's press, then its action), and they stay the same from one
 * record to the next, so rows don't render again.
 */
export const current = () => readPanel(currentSearch())

/**
 * The record panel's address and its moves (spec 6.3, 7.1, decision 137): which
 * record is open, the linked records after it, a new one; opening, following a link,
 * stepping back and closing, each with the history entry it needs.
 */
export function usePanel(key: string) {
  // The panel's address (spec 6.3, 7.1, decision 137): the record open (?open=), a new
  // one (?new=1), the linked records opened after it (?linked=key:id,…).
  const [panel] = useQueryStates(panelParsers)
  const openId = panel.open
  const chain = panel.linked
  const isNew = panel.new === '1'
  const panelMark = `panel:${key}`
  /**
   * Changes the panel's parameters at once (nuqs's own updates wait a moment), with an
   * entry that carries this screen's marks, which nuqs can't set: pushed, or replacing
   * the current one. The entry keeps its place in a drill-down (spec 12.1).
   */
  const mark = useCallback(
    (
      values: Parameters<typeof panelAddress>[1],
      state: Record<string, unknown>,
      replace = false,
    ) => {
      const drill = entryState().drill
      navigate(panelAddress(currentAddress(), values), {
        replace,
        state: { ...(drill === undefined ? {} : { drill }), ...state },
      })
    },
    [],
  )
  const open = useCallback(
    (id: Id) => {
      const wasOpen = current().open
      if (wasOpen === id) return
      // Another record from the list: no linked ones after it. Opening pushes an
      // entry (Back closes); switching records replaces it.
      if (wasOpen)
        mark(
          { open: id, linked: null },
          { ...entryState(), linkedStep: false },
          true,
        )
      else mark({ open: id, linked: null }, { panel: panelMark })
    },
    [mark, panelMark],
  )

  /** Shows the chain cut to this many steps (0: the record opened from the list). */
  const showChain = useCallback(
    (next: Step[]) => mark({ linked: next }, entryState(), true),
    [mark],
  )
  /** A section's record opens in the panel; Back returns to the one before. */
  const openLinked = useCallback(
    (collectionKey: string, id: Id, section: string) =>
      mark(
        { linked: [...current().linked, { key: collectionKey, id, section }] },
        { ...entryState(), linkedStep: true },
      ),
    [mark],
  )
  /** "‹ {collection}" on a narrow screen: the list, whatever the depth. */
  const leave = useCallback(
    () => mark({ open: null, linked: null }, entryState(), true),
    [mark],
  )
  /**
   * Back to the chain cut to this depth (a tab, or × one step): through the browser's
   * history when the steps were pushed, so Back never meets a stale entry after it.
   */
  // ponytail: assumes each step after the first linked one was pushed (openLinked
  // does); a chain from a link (the address alone) has no entries, so it is replaced.
  const stepTo = useCallback(
    (depth: number) => {
      const steps = current().linked.length - depth
      if (steps <= 0) return
      if (entryState().linkedStep === true) window.history.go(-steps)
      else showChain(current().linked.slice(0, depth))
    },
    [showChain],
  )
  /** × on a linked record: one step back, as Back does. */
  const stepBack = useCallback(
    () => stepTo(current().linked.length - 1),
    [stepTo],
  )
  const doClose = useCallback(() => {
    if (entryState().panel === panelMark) window.history.back()
    else mark({ open: null }, entryState(), true)
  }, [panelMark, mark])

  return {
    openId,
    chain,
    isNew,
    panelMark,
    mark,
    open,
    openLinked,
    leave,
    stepTo,
    stepBack,
    doClose,
  }
}
