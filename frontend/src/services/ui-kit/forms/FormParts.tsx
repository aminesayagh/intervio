import { Alert } from '@heroui/react'
import type { ReactNode } from 'react'

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="mb-5 text-2xl leading-tight">{children}</h1>
}

/** Message about the whole form, shown above it; pass the translated text. */
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null
  return (
    <Alert status="danger" className="mb-4">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <Alert status="success" className="mb-4">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  )
}
