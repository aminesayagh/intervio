import { Button, Form } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../../navigation'
import { companyApi, companyKey, errorKey, useCompany } from '../api'
import {
  CompanyDetailsFields,
  type CompanyDetails,
} from '../details/CompanyDetailsFields'
import { StepTitle } from './StepParts'
import { notify } from '../../../notifications'

/** Step 1 (required): company name, country of registration, registration number. */
export function CompanyStepPage() {
  const { data: company } = useCompany()
  // Remount when the saved company arrives, so the fields start from it.
  return <CompanyForm key={company ? 'saved' : 'new'} />
}

function CompanyForm() {
  const { t } = useTranslation('companies')
  const queryClient = useQueryClient()
  const { data: saved } = useCompany()
  const [details, setDetails] = useState<CompanyDetails>({
    name: saved?.name ?? '',
    country: saved?.country ?? null,
    registrationNumber: saved?.registrationNumber ?? '',
  })
  const [countryMissing, setCountryMissing] = useState(false)
  const [pending, setPending] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { name, country, registrationNumber } = details
    if (!country) {
      setCountryMissing(true)
      return
    }
    setPending(true)
    try {
      const company = await companyApi.saveDetails(
        name,
        country,
        registrationNumber,
      )
      queryClient.setQueryData(companyKey, company)
      navigate('/onboarding/industries')
    } catch (e) {
      notify({
        tone: 'error',
        text: t(errorKey(e), { defaultValue: t('errors.ERROR_UNKNOWN') }),
        key: 'CompanyStepPage:CompanyForm',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <StepTitle step={1}>{t('company.title')}</StepTitle>

      <Form onSubmit={save} className="flex flex-col gap-3">
        <CompanyDetailsFields
          value={details}
          onChange={setDetails}
          countryMissing={countryMissing}
        />
        <Button type="submit" fullWidth isPending={pending} className="mt-1">
          {t('continue')}
        </Button>
      </Form>
    </>
  )
}
