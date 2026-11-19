import { Button } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../../navigation'
import { FormError } from '../../../ui-kit'
import { companyApi, companyKey, errorKey } from '../api'
import { StepLinks, StepTitle } from '../components'
import { checkLogo } from '../logo'

/** Step 3 (optional): the company logo, PNG or JPG up to 2 MB. The client board opens after it. */
export function LogoStepPage() {
  const { t } = useTranslation('companies')
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(
    () => () => void (preview && URL.revokeObjectURL(preview)),
    [preview],
  )

  function choose(chosen: File | undefined) {
    if (!chosen) return
    const invalid = checkLogo(chosen)
    setError(invalid)
    if (invalid) return
    setFile(chosen)
    setPreview(URL.createObjectURL(chosen))
  }

  async function finish() {
    if (!file) return done()
    setError(null)
    setPending(true)
    try {
      await companyApi.uploadLogo(file)
      await queryClient.invalidateQueries({ queryKey: companyKey })
      done()
    } catch (e) {
      setError(errorKey(e))
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
        message={error && t(error, { defaultValue: t('errors.ERROR_UNKNOWN') })}
      />
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => choose(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-[var(--field-radius)] border border-dashed border-border bg-surface"
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt=""
              className="max-h-24 max-w-[60%] object-contain"
            />
            <span className="underline underline-offset-4">
              {t('logo.change')}
            </span>
          </>
        ) : (
          <span className="underline underline-offset-4">
            {t('logo.upload')}
          </span>
        )}
      </button>
      <p className="mt-2 mb-5 text-xs text-muted">{t('logo.help')}</p>
      <Button fullWidth isPending={pending} onPress={finish}>
        {t('logo.finish')}
      </Button>
      <StepLinks back="/onboarding/industries" skip={done} />
    </>
  )
}
