import { act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { reachListEnd } from './layout'

/**
 * The panel was scrolled down to its linked records: they are built once they come
 * near (RecordBody's WhenNear), as React Aria's load-more item is (test-setup.ts).
 */
export function seeSections() {
  act(() => reachListEnd())
}

/**
 * The pointer reached a value of the panel: its editor wakes (decision 139). Returns
 * the value's box, to look for the editor in it.
 */
export async function reachValue(panel: HTMLElement, label: string) {
  const term = within(panel).getByText(label, { selector: 'dt' })
  const box = term.nextElementSibling!.firstElementChild as HTMLElement
  await userEvent.hover(box)
  return box
}
