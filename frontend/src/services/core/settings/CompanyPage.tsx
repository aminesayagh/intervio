import { Button, Form, Label, ListBox, Select } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePicker } from '../../files'
import { navigate, usePath } from '../../navigation'
import { FormError } from '../../ui-kit'
import {
  companyApi,
  companyErrorKey,
  companyKey,
  CompanyDetailsFields,
  type CompanyDetails,
  INDUSTRY_CODES,
  useCompany,
  type Company,
} from '../companies'
import { SettingsLayout } from './SettingsLayout'

/** Settings, a company's tab (decision 91): the onboarding fields, with the same rules. */
export function CompanyPage() {
  const { t } = useTranslation('settings')
  const path = usePath()
  const { data: company } = useCompany()
  const id = path.split('/')[3]

  // An address for a company the user does not have opens their company's tab.
  useEffect(() => {
    if (company && company.id !== id)
      navigate(`/settings/companies/${company.id}`, { replace: true })
  }, [company, id])

  if (!company || company.id !== id) return null
  return (
    <SettingsLayout
      heading={company.name}
      description={t('company.description')}
    >
      <div className="grid max-w-[960px] gap-8 min-[1400px]:grid-cols-[456px_1fr]">
        <div className="max-w-[456px]">
          <Details key={company.id} company={company} />
        </div>
        <Logo company={company} />
      </div>
    </SettingsLayout>
  )
}

function Details({ company }: { company: Company }) {
  const { t } = useTranslation('settings')
  const { t: tc } = useTranslation('companies')
  const queryClient = useQueryClient()
  const [details, setDetails] = useState<CompanyDetails>({
    name: company.name,
    country: company.country,
    registrationNumber: company.registrationNumber,
  })
  const [countryMissing, setCountryMissing] = useState(false)
  const [industries, setIndustries] = useState(company.industries.map(String))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { name, country, registrationNumber } = details
    if (!country) {
      setCountryMissing(true)
      return
    }
    setError(null)
    setSaved(false)
    setPending(true)
    try {
      await companyApi.saveDetails(name, country, registrationNumber)
      queryClient.setQueryData(
        companyKey,
        await companyApi.saveIndustries(industries.map(Number)),
      )
      setSaved(true)
    } catch (e) {
      setError(companyErrorKey(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <Form onSubmit={save} className="flex flex-col gap-3">
      <FormError
        message={
          error && tc(error, { defaultValue: tc('errors.ERROR_UNKNOWN') })
        }
      />
      <CompanyDetailsFields
        value={details}
        onChange={setDetails}
        countryMissing={countryMissing}
      />
      <Select
        fullWidth
        selectionMode="multiple"
        value={industries}
        onChange={(keys) => setIndustries((keys as string[]).map(String))}
        placeholder={t('company.industriesPlaceholder')}
      >
        <Label>{t('company.industries')}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {INDUSTRY_CODES.map((code) => (
              <ListBox.Item
                key={code}
                id={code}
                textValue={tc(`industries.${code}`)}
              >
                {tc(`industries.${code}`)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <div className="flex items-center gap-3">
        <Button type="submit" isPending={pending}>
          {t('save')}
        </Button>
        {saved && <span className="text-muted">{t('saved')}</span>}
      </div>
    </Form>
  )
}

function Logo({ company }: { company: Company }) {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const save = (c: Company) => queryClient.setQueryData(companyKey, c)
  return (
    <ImagePicker
      purpose="companyLogo"
      label={t('company.logo')}
      src={company.logoFileId ? `/api/files/${company.logoFileId}` : null}
      uploadLabel={t('company.uploadLogo')}
      removeLabel={t('remove')}
      onUploaded={async (id) => save(await companyApi.setLogo(id))}
      onRemove={
        company.logoFileId
          ? async () => save(await companyApi.removeLogo())
          : undefined
      }
    />
  )
}
