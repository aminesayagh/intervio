import { Button } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileDropzone,
  fileUrl,
  uploadErrorKey,
  uploadFile,
} from '../../../files'
import { navigate } from '../../../navigation'
import { FormError } from '../../../ui-kit'
import { companyApi, companyKey, useCompany } from '../api'
import { StepLinks, StepTitle } from '../components'

/** Step 3 (optional): the company logo, PNG or JPG up to 2 MB. The client board opens after it. */
export function LogoStepPage() {
  const { t } = useTranslation('companies')
  const { t: tf } = useTranslation('files')
  const queryClient = useQueryClient()
  const { data: company } = useCompany()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function finish() {
    if (!file) return done()
    setError(null)
    setPending(true)
    try {
      const uploaded = await uploadFile('companyLogo', file)
      queryClient.setQueryData(
        companyKey,
        await companyApi.setLogo(uploaded.id),
      )
      done()
    } catch (e) {
      setError(uploadErrorKey(e))
    } finally {
      setPending(false)
    }
  }

  function done() {
    navigate('/', { replace: true })
  }

  return (
    <>
      <StepTitle step={3}>{t('logo.title')}</StepTitle>
      <FormError
        message={
          error && tf(error, { defaultValue: tf('errors.ERROR_UNKNOWN') })
        }
      />
      <FileDropzone
        purpose="companyLogo"
        label={t('logo.upload')}
        currentUrl={company?.logoFileId ? fileUrl(company.logoFileId) : null}
        onChange={setFile}
        onError={setError}
      />
      <p className="mt-2 mb-5 text-xs text-muted">{t('logo.help')}</p>
      <Button fullWidth isPending={pending} onPress={finish}>
        {t('logo.finish')}
      </Button>
      <StepLinks back="/onboarding/industries" skip={done} />
    </>
  )
}
