import { useQuery } from '@tanstack/react-query'
import { api, ApiError } from '../../http'

export type Company = {
  name: string
  country: string
  registrationNumber: string
  industries: number[]
  logoFileId: string | null
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
  /** Uses an uploaded file (purpose companyLogo) as the logo; the previous logo is deleted. */
  setLogo: (fileId: string) =>
    api<Company>('/api/company/logo', {
      method: 'PUT',
      body: { json: { fileId } },
    }),
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
