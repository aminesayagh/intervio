import { useRecordActions } from '../data/recordActions'
import type { AnyCollection } from '../definition'
import { RecordPanel } from './RecordPanel'
import { findCollection, type Step } from './linked'

const nothing = () => {}

/**
 * A linked record in the panel (decision 137): shown with its own collection's panel
 * definition, changed through its own collection's record actions (save, More
 * actions). × goes back one step, as archiving or removing it does.
 */
export function LinkedPanel({
  root,
  step,
  onClose,
  onLeave,
  back,
}: {
  /** The collection on screen; the linked one is found through its sections. */
  root: AnyCollection
  step: Step
  onClose: () => void
  onLeave: () => void
  back?: string
}) {
  const linked = findCollection(root, step.key) ?? root
  const actions = useRecordActions(linked, undefined)
  if (!linked.panel) return null
  return (
    <RecordPanel
      definition={linked}
      panel={linked.panel}
      context={undefined}
      id={step.id}
      fromList={undefined}
      onClose={onClose}
      onLeave={onLeave}
      back={back}
      onUnavailable={nothing}
      canEdit={actions.canEdit}
      save={actions.save}
      report={actions.report}
      actions={(record) => actions.menu(record)}
      onAction={actions.runMenu}
    />
  )
}
