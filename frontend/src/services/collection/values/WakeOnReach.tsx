import { useState, type ReactNode } from 'react'
import { Awake, useHandFocus } from './awake'

/**
 * A value in the panel, its editor asleep until the person reaches it (decision 139):
 * the pointer over it or the focus on it wakes it, for good. Opening a record then
 * builds no editor at all.
 */
export function WakeOnReach({ children }: { children: ReactNode }) {
  const [awake, setAwake] = useState(false)
  const { boxRef, onFocusCapture } = useHandFocus<HTMLDivElement>(awake)
  const wake = () => setAwake(true)
  return (
    <div
      ref={boxRef}
      onPointerOver={wake}
      onFocusCapture={(event) => {
        onFocusCapture(event)
        wake()
      }}
    >
      <Awake value={awake}>{children}</Awake>
    </div>
  )
}
