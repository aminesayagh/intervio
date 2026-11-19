import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../../http'

export type InterventionStatus = 'draft' | 'published'

/** One card in the gallery or one entry in the sidebar. */
export type InterventionSummary = {
  id: string
  title: string
  status: InterventionStatus
  offerDeadline: string
  documentCount: number
  updatedAt: string
}

export type InterventionDocument = {
  id: string
  name: string
  contentType: string
  sizeBytes: number
}

export type Intervention = {
  id: string
  title: string
  description: string
  status: InterventionStatus
  offerDeadline: string
  publishedAt: string | null
  specifications: InterventionDocument[]
}

export type NewIntervention = {
  title: string
  description: string
  offerDeadline: string
  specificationFileIds: string[]
  /** Only for the company's first intervention (decision 94). */
  address?: { street: string; city: string; postalCode: string }
}

/** Every intervention query starts with this key, so one invalidation refreshes them all. */
export const interventionsKey = ['interventions']

export const interventionApi = {
  create: (body: NewIntervention) =>
    api<Intervention>('/api/interventions', { body: { json: body } }),
  publish: (id: string) =>
    api<Intervention>(`/api/interventions/${id}/publish`, { method: 'POST' }),
}

/** The sidebar: the six last opened, and how many the company has in all. */
export function useRecentInterventions() {
  return useQuery({
    queryKey: [...interventionsKey, 'recent'],
    queryFn: () =>
      api<{ items: InterventionSummary[]; total: number }>(
        '/api/interventions/recent',
      ),
  })
}

export function useInterventions() {
  return useQuery({
    queryKey: [...interventionsKey, 'all'],
    queryFn: () => api<InterventionSummary[]>('/api/interventions'),
  })
}

/** Opening an intervention also records the visit on the server. */
export function useIntervention(id: string) {
  return useQuery({
    queryKey: [...interventionsKey, 'one', id],
    retry: false,
    queryFn: () => api<Intervention>(`/api/interventions/${id}`),
  })
}

/** "12 Jan 2027" in the interface language; the date is a calendar day, not a moment. */
export function formatDay(day: string, language: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(
    new Date(y, m - 1, d),
  )
}

/** Translation key (interventions namespace) of the message for any error. */
export function errorKey(error: unknown) {
  return `errors.${error instanceof ApiError ? error.code : 'ERROR_UNKNOWN'}`
}
