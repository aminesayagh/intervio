import {
  Button,
  ComboBox,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
} from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../../navigation'
import { check, Field, FormError } from '../../../ui-kit'
import { companyApi, companyKey, errorKey, useCompany } from '../api'
import { StepTitle } from '../components'
import { countries } from '../countries'

/** Step 1 (required): company name, country of registration, registration number. */
export function CompanyStepPage() {
  const { data: company } = useCompany()
  // Remount when the saved company arrives, so the fields start from it.
  return <CompanyForm key={company ? 'saved' : 'new'} />
}

function CompanyForm() {
  const { t, i18n } = useTranslation('companies')
  const { t: tk } = useTranslation('ui-kit')
  const queryClient = useQueryClient()
  const { data: saved } = useCompany()
  const [name, setName] = useState(saved?.name ?? '')
  const [country, setCountry] = useState<string | null>(saved?.country ?? null)
  const [number, setNumber] = useState(saved?.registrationNumber ?? '')
  const [countryMissing, setCountryMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const options = useMemo(() => countries(i18n.language), [i18n.language])

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
        <ComboBox
          fullWidth
          selectedKey={country}
          onSelectionChange={(key) => {
            setCountry(key ? String(key) : null)
            setCountryMissing(false)
          }}
          isInvalid={countryMissing}
        >
          <Label>{t('company.country')}</Label>
          <ComboBox.InputGroup>
            <Input placeholder={t('company.countryPlaceholder')} />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <ListBox>
              {options.map((c) => (
                <ListBox.Item key={c.code} id={c.code} textValue={c.name}>
                  {c.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </ComboBox.Popover>
          <FieldError>{tk('validation.required')}</FieldError>
        </ComboBox>
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
