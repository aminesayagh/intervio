import { useRecordActions } from '../data/recordActions'
import { RecordPanel } from './RecordPanel'
import type { ChainStep } from './linked'

const nothing = () => {}

/**
 * A linked record in the panel (decision 137): shown with its own collection's panel
 * definition, changed through its own collection's record actions (save, More
 * actions). × goes back one step, as archiving or removing it does.
 */
export function LinkedPanel({
  step,
  onClose,
  onLeave,
  back,
}: {
  /** The linked record, its collection and its context (`useChain`). */
  step: ChainStep
  onClose: () => void
  onLeave: () => void
  back?: string
}) {
  const linked = step.collection
  const actions = useRecordActions(linked, step.context)
  if (!linked.panel) return null
  return (
    <RecordPanel
      definition={linked}
      panel={linked.panel}
      context={step.context}
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
