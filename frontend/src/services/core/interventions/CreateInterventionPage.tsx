import { Button, Form } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentsField, type UploadedFile } from '../../files'
import { navigate } from '../../navigation'
import { check, Field } from '../../ui-kit'
import { notify } from '../../notifications'
import { companyKey, useCompany } from '../companies'
import { errorKey, interventionApi, interventionsKey } from './api'

/** Tomorrow or later: the offer deadline is in the future. */
function futureDay(value: string) {
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD, local time
  return (
    check.required(value) ?? (value > today ? null : 'validation.futureDate')
  )
}

/**
 * "Create an intervention" (decision 94): title, description, specifications, offer deadline;
 * the company's registered address the first time. It creates a draft and opens its Overview.
 */
export function CreateInterventionPage() {
  const { t } = useTranslation('interventions')
  const queryClient = useQueryClient()
  const { data: company } = useCompany()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [specs, setSpecs] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [pending, setPending] = useState(false)
  const askAddress = company ? !company.hasAddress : false

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      const intervention = await interventionApi.create({
        title,
        description,
        offerDeadline: deadline,
        specificationFileIds: specs.map((f) => f.id),
        address: askAddress ? { street, city, postalCode } : undefined,
      })
      queryClient.setQueryData(
        [...interventionsKey, 'one', intervention.id],
        intervention,
      )
      await queryClient.invalidateQueries({ queryKey: interventionsKey })
      if (askAddress)
        await queryClient.invalidateQueries({ queryKey: companyKey })
      navigate(`/interventions/${intervention.id}`)
    } catch (e) {
      notify({
        tone: 'error',
        text: t(errorKey(e), { defaultValue: t('errors.ERROR_UNKNOWN') }),
        key: 'CreateInterventionPage:CreateInterventionPage',
      })
      setPending(false)
    }
  }

  return (
    <>
      <h1 className="text-xl font-medium">{t('create')}</h1>
      <Form
        onSubmit={create}
        className="mt-6 flex max-w-[552px] flex-col gap-4"
      >
        <Field
          name="title"
          label={t('form.title')}
          placeholder={t('form.titlePlaceholder')}
          value={title}
          onChange={setTitle}
          check={check.required}
        />
        <Field
          name="description"
          multiline
          label={t('form.description')}
          placeholder={t('form.descriptionPlaceholder')}
          value={description}
          onChange={setDescription}
        />
        <DocumentsField
          label={t('form.specifications')}
          value={specs}
          onChange={setSpecs}
          onPendingChange={setUploading}
        />
        <Field
          name="offerDeadline"
          type="date"
          label={t('form.offerDeadline')}
          value={deadline}
          onChange={setDeadline}
          check={futureDay}
        />
        {askAddress && company && (
          <div className="mt-2 flex flex-col gap-3">
            <div>
              <h2 className="text-base font-medium">
                {t('form.addressTitle', { company: company.name })}
              </h2>
              <p className="text-muted">{t('form.addressHelp')}</p>
            </div>
            <Field
              name="street"
              autoComplete="street-address"
              label={t('form.street')}
              placeholder={t('form.streetPlaceholder')}
              value={street}
              onChange={setStreet}
              check={check.required}
            />
            <div className="grid grid-cols-[1fr_168px] gap-3">
              <Field
                name="city"
                autoComplete="address-level2"
                label={t('form.city')}
                placeholder={t('form.cityPlaceholder')}
                value={city}
                onChange={setCity}
                check={check.required}
              />
              <Field
                name="postalCode"
                autoComplete="postal-code"
                label={t('form.postalCode')}
                placeholder={t('form.postalCodePlaceholder')}
                value={postalCode}
                onChange={setPostalCode}
                check={check.required}
              />
            </div>
          </div>
        )}
        <Button
          type="submit"
          isPending={pending}
          isDisabled={uploading}
          className="mt-2 w-fit"
        >
          {t('form.submit')}
        </Button>
      </Form>
    </>
  )
}
