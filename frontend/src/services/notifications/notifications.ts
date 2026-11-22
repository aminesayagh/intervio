import { toast } from '@heroui/react'

/**
 * The app's only way to show a notification (decision 132): every screen calls
 * `notify`, never a toast library directly, and only `Notifications` draws them.
 * HeroUI's toast does the queue, the timing and the announcements; this adds what it
 * can't know: a notification belongs to an interaction (its scope) and leaves with it,
 * and a new one about the same value (its key) replaces the old one.
 */
export type Notification = {
  text: string
  tone: 'error' | 'confirm'
  /** Retry, Undo: a notification with one stays until it is used or closed. */
  action?: { label: string; run: () => void }
  /** The interaction it belongs to, such as `resources:record:{id}` or `resources`. */
  scope?: string
  /** The value it is about, such as `resources:{id}:status`. */
  key?: string
}

/** How long a notification without an action stays, in ms. */
export const NOTIFICATION_DURATION = 6000

const open = new Map<string, Pick<Notification, 'scope' | 'key'>>()

function close(test: (n: Pick<Notification, 'scope' | 'key'>) => boolean) {
  for (const [id, n] of open)
    if (test(n)) {
      open.delete(id)
      toast.close(id)
    }
}

/** Shows a notification; returns its id. */
export function notify({ text, tone, action, scope, key }: Notification) {
  if (key) close((n) => n.key === key)
  const id: string = toast(text, {
    variant: tone === 'error' ? 'danger' : 'default',
    timeout: action ? 0 : NOTIFICATION_DURATION,
    actionProps: action && {
      children: action.label,
      onPress: () => {
        open.delete(id)
        toast.close(id)
        action.run()
      },
    },
    onClose: () => open.delete(id),
  })
  open.set(id, { scope, key })
  return id
}

/** Removes the notification about a value (it was saved after all). */
export const dismissKey = (key: string) => close((n) => n.key === key)

/** Removes an interaction's notifications and those inside it (`a` covers `a:b`). */
export const dismissScope = (scope: string) =>
  close(
    (n) => !!n.scope && (n.scope === scope || n.scope.startsWith(`${scope}:`)),
  )

export function clearNotifications() {
  open.clear()
  toast.clear()
}
