import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../../http'

export type Company = {
  name: string
  country: string
  registrationNumber: string
  industries: number[]
  hasLogo: boolean
}

export const companyKey = ['company']

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
  uploadLogo: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api('/api/company/logo', { method: 'PUT', body: { file: form } })
  },
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
