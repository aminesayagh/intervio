import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../../http'

export type Company = {
  id: string
  name: string
  country: string
  registrationNumber: string
  industries: number[]
  logoFileId: string | null
  /** The registered address is asked with the first intervention (decision 59). */
  hasAddress: boolean
}

export const companyKey = ['company']

/** Industry codes 1-14, matching the backend's list. */
export const INDUSTRY_CODES = Array.from({ length: 14 }, (_, i) =>
  String(i + 1),
)

export const companyApi = {
  saveDetails: (name: string, country: string, registrationNumber: string) =>
    api<Company>('/api/company', {
      method: 'PUT',
      body: { json: { name, country, registrationNumber } },
    }),
  saveIndustries: (industries: number[]) =>
    api<Company>('/api/company/industries', {
      method: 'PUT',
      body: { json: { industries } },
    }),
  /** Uses an uploaded file (purpose companyLogo) as the logo; the previous logo is deleted. */
  setLogo: (fileId: string) =>
    api<Company>('/api/company/logo', {
      method: 'PUT',
      body: { json: { fileId } },
    }),
  removeLogo: () => api<Company>('/api/company/logo', { method: 'DELETE' }),
}

/** The client's company, or null before onboarding. */
export function useCompany(enabled = true) {
  return useQuery({
    queryKey: companyKey,
    enabled,
    retry: false,
    queryFn: async () => {
      try {
        return await api<Company>('/api/company')
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
  })
}

/** Translation key (companies namespace) of the message for any error. */
export function errorKey(error: unknown) {
  return `errors.${error instanceof ApiError ? error.code : 'ERROR_UNKNOWN'}`
}
