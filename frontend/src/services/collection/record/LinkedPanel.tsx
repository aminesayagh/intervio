import type { AnyCollection } from '../definition'
import { RecordPanel } from './RecordPanel'
import { findCollection, useLinkedEditing, type Step } from './linked'

const nothing = () => {}
const noActions = () => []

/**
 * A linked record in the panel (decision 137): shown with its own collection's panel
 * definition, changed through its own data source. × goes back one step.
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
  const editing = useLinkedEditing(linked)
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
      canEdit={editing.canEdit}
      save={editing.save}
      report={editing.report}
      actions={noActions}
      onAction={nothing}
    />
  )
}
