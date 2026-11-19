import { Button, Form } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../../navigation'
import { check, Field, FormError } from '../../../ui-kit'
import { companyApi, companyKey, errorKey, useCompany } from '../api'
import { CountryField, StepTitle } from '../components'

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
  const [name, setName] = useState(saved?.name ?? '')
  const [country, setCountry] = useState<string | null>(saved?.country ?? null)
  const [number, setNumber] = useState(saved?.registrationNumber ?? '')
  const [countryMissing, setCountryMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!country) {
      setCountryMissing(true)
      return
    }
    setError(null)
    setPending(true)
    try {
      const company = await companyApi.saveDetails(name, country, number)
      queryClient.setQueryData(companyKey, company)
      navigate('/onboarding/industries')
    } catch (e) {
      setError(errorKey(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <StepTitle step={1}>{t('company.title')}</StepTitle>
      <FormError
        message={error && t(error, { defaultValue: t('errors.ERROR_UNKNOWN') })}
      />
      <Form onSubmit={save} className="flex flex-col gap-3">
        <Field
          name="name"
          autoComplete="organization"
          label={t('company.name')}
          placeholder={t('company.namePlaceholder')}
          value={name}
          onChange={setName}
          check={check.required}
        />
        <CountryField
          value={country}
          onChange={(code) => {
            setCountry(code)
            setCountryMissing(false)
          }}
          isInvalid={countryMissing}
        />
        <Field
          name="registrationNumber"
          label={t('company.number')}
          placeholder={t('company.numberPlaceholder')}
          value={number}
          onChange={setNumber}
          check={check.required}
        />
        <Button type="submit" fullWidth isPending={pending} className="mt-1">
          {t('continue')}
        </Button>
      </Form>
    </>
  )
}
