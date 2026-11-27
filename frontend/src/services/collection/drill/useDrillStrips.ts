import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../navigation'
import { foldSidebar, offerBack } from '../../ui-kit'
import type { useLayoutMode } from '../layout/layout'
import type { Fold } from './Folded'
import { currentViews } from './viewStack'

/**
 * The views this list was drilled from (spec 12.1): a strip each after the sidebar,
 * none on a narrow screen, where the top bar's ‹ goes up one level instead. At medium
 * width the sidebar folds while a panel or a strip shows (spec 9).
 */
export function useDrillStrips(
  mode: ReturnType<typeof useLayoutMode>,
  panelShown: boolean,
) {
  const { t } = useTranslation('collection')
  // The views this list was drilled from (spec 12.1): a strip each, after the sidebar.
  // Returning to one takes it and the views after it off the stack.
  const views: Fold[] = currentViews().map((view, index) => ({
    name: view.name,
    open: () => navigate(view.address, { state: { drill: index } }),
  }))
  const strips = mode === 'narrow' ? [] : views
  const hasStrips = strips.length > 0
  // Narrow: no strips; the top bar's ‹ goes up one level, as the last strip would.
  const up = mode === 'narrow' ? views.at(-1) : undefined
  const upName = up?.name
  const upOpen = up?.open
  useEffect(() => {
    if (!upName || !upOpen) return
    return offerBack({
      label: t('collection:folds.back', { name: upName }),
      run: upOpen,
    })
    // A new function each render: the address and the name say which view it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upName, t])
  // Medium width: the sidebar folds while a panel or a strip shows (spec 9, 12.1).
  useEffect(() => {
    foldSidebar(mode === 'medium' && (panelShown || hasStrips))
    return () => foldSidebar(false)
  }, [mode, panelShown, hasStrips])
  return { strips, hasStrips }
}
