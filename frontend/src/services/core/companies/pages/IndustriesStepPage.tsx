import { Button, Checkbox, CheckboxGroup } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../../navigation'
import {
  companyApi,
  companyKey,
  errorKey,
  INDUSTRY_CODES,
  useCompany,
} from '../api'
import { StepLinks, StepTitle } from './StepParts'
import { notify } from '../../../notifications'

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
  const [pending, setPending] = useState(false)

  async function save() {
    setPending(true)
    try {
      queryClient.setQueryData(
        companyKey,
        await companyApi.saveIndustries(selected.map(Number)),
      )
      navigate('/onboarding/logo')
    } catch (e) {
      notify({
        tone: 'error',
        text: t(errorKey(e), { defaultValue: t('errors.ERROR_UNKNOWN') }),
        key: 'IndustriesStepPage:IndustriesForm',
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <StepTitle step={2}>{t('industries.title')}</StepTitle>

      <CheckboxGroup
        aria-label={t('industries.title')}
        value={selected}
        onChange={setSelected}
        className="mb-5"
      >
        <p className="mb-3">{t('industries.intro')}</p>
        <div className="grid grid-flow-col grid-cols-2 grid-rows-7 gap-x-4 gap-y-0">
          {INDUSTRY_CODES.map((code) => (
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
