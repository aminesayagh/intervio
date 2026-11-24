import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect } from 'vitest'
import { reachListEnd } from './layout'

/**
 * The panel was scrolled down to its linked records: they are built once they come
 * near (RecordBody's WhenNear), as React Aria's load-more item is (test-setup.ts).
 */
export function seeSections() {
  act(() => reachListEnd())
}

/**
 * The pointer reached a value of the panel: its editor wakes (decision 139). An empty
 * one is "Add …" (decision 151): it is pressed, and a menu it opens is closed again,
 * so the test finds the editor as for a value. Returns the value's box.
 */
export async function reachValue(panel: HTMLElement, label: string) {
  const term = within(panel).getByText(label, { selector: 'dt' })
  const box = term.nextElementSibling!.firstElementChild as HTMLElement
  await userEvent.hover(box)
  const add = within(box).queryByRole('button', { name: `Add ${label}` })
  if (add) {
    await userEvent.click(add)
    await waitFor(() =>
      expect(
        within(box).queryByRole('button', { name: `Add ${label}` }),
      ).toBeNull(),
    )
    if (screen.queryByRole('menu') || screen.queryByRole('dialog'))
      await userEvent.keyboard('{Escape}')
  }
  return box
}

/**
 * The pointer reached the row holding an element: its cells' controls wake
 * (decision 139). Look the control up again afterwards: the still one is gone.
 */
export async function reachRow(inside: HTMLElement) {
  await userEvent.hover(inside.closest<HTMLElement>('[role="row"]')!)
}
