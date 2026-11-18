import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Button } from '@heroui/react'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="p-6">
        <h1 className="text-2xl">Intervio</h1>
        <Button>Setup check</Button>
      </main>
    </QueryClientProvider>
  )
}
