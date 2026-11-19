import { Button, Checkbox, CheckboxGroup } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../../navigation'
import { FormError } from '../../../ui-kit'
import { companyApi, companyKey, errorKey, useCompany } from '../api'
import { StepLinks, StepTitle } from '../components'

const CODES = Array.from({ length: 14 }, (_, i) => String(i + 1))

/** Step 2 (optional): the industries the company works in, in two columns. */
export function IndustriesStepPage() {
  const { data: company } = useCompany()
  return (
    <IndustriesForm
      key={company ? 'saved' : 'new'}
      initial={company?.industries ?? []}
    />
  )
}

function IndustriesForm({ initial }: { initial: number[] }) {
  const { t } = useTranslation('companies')
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string[]>(initial.map(String))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function save() {
    setError(null)
    setPending(true)
    try {
      queryClient.setQueryData(
        companyKey,
        await companyApi.saveIndustries(selected.map(Number)),
      )
      navigate('/onboarding/logo')
    } catch (e) {
      setError(errorKey(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <StepTitle step={2}>{t('industries.title')}</StepTitle>
      <FormError
        message={error && t(error, { defaultValue: t('errors.ERROR_UNKNOWN') })}
      />
      <CheckboxGroup
        aria-label={t('industries.title')}
        value={selected}
        onChange={setSelected}
        className="mb-5"
      >
        <p className="mb-3">{t('industries.intro')}</p>
        <div className="grid grid-flow-col grid-cols-2 grid-rows-7 gap-x-4 gap-y-0">
          {CODES.map((code) => (
            <Checkbox key={code} value={code}>
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                {t(`industries.${code}`)}
              </Checkbox.Content>
            </Checkbox>
          ))}
        </div>
      </CheckboxGroup>
      <Button fullWidth isPending={pending} onPress={save}>
        {t('continue')}
      </Button>
      <StepLinks
        back="/onboarding/company"
        skip={() => navigate('/onboarding/logo')}
      />
    </>
  )
}
