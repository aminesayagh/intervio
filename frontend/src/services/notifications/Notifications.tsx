import { Toast } from '@heroui/react'

/**
 * Where notifications show: the bottom centre, three at most, the newest in front
 * (decision 132). Mounted once, at the root of the app; nothing else draws toasts.
 */
export function Notifications() {
  return <Toast.Provider placement="bottom" maxVisibleToasts={3} />
}
