import { ComboBox, FieldError, Input, Label, ListBox } from '@heroui/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { check, Field } from '../../../ui-kit'
import { countries } from '../countries'

/** A company's details as its forms edit them. */
export type CompanyDetails = {
  name: string
  country: string | null
  registrationNumber: string
}

/**
 * The company's name, country of registration and registration number (#73): the same
 * fields, rules and placeholders in onboarding and in Settings; each screen keeps its
 * own saving. `countryMissing` is set by the screen when a save finds no country, so
 * the country is marked only after the person tries to save (decided 2026-11-26).
 */
export function CompanyDetailsFields({
  value,
  onChange,
  countryMissing,
}: {
  value: CompanyDetails
  onChange: (next: CompanyDetails) => void
  countryMissing: boolean
}) {
  const { t } = useTranslation('companies')
  return (
    <>
      <Field
        name="name"
        autoComplete="organization"
        label={t('company.name')}
        placeholder={t('company.namePlaceholder')}
        value={value.name}
        onChange={(name) => onChange({ ...value, name })}
        check={check.required}
      />
      <CountryField
        value={value.country}
        onChange={(country) => onChange({ ...value, country })}
        isInvalid={countryMissing && !value.country}
      />
      <Field
        name="registrationNumber"
        label={t('company.number')}
        placeholder={t('company.numberPlaceholder')}
        value={value.registrationNumber}
        onChange={(registrationNumber) =>
          onChange({ ...value, registrationNumber })
        }
        check={check.required}
      />
    </>
  )
}

/** Country of registration: a searchable list with flags (onboarding and Settings). */
function CountryField({
  value,
  onChange,
  isInvalid,
}: {
  value: string | null
  onChange: (code: string | null) => void
  isInvalid?: boolean
}) {
  const { t, i18n } = useTranslation('companies')
  const { t: tk } = useTranslation('ui-kit')
  const options = useMemo(() => countries(i18n.language), [i18n.language])
  return (
    <ComboBox
      fullWidth
      selectedKey={value}
      onSelectionChange={(key) => onChange(key ? String(key) : null)}
      isInvalid={isInvalid}
    >
      <Label>{t('company.country')}</Label>
      <ComboBox.InputGroup className="relative">
        {value && (
          <Flag
            code={value}
            className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2"
          />
        )}
        <Input
          placeholder={t('company.countryPlaceholder')}
          className={value ? 'ps-10' : undefined}
        />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox>
          {options.map((c) => (
            <ListBox.Item key={c.code} id={c.code} textValue={c.name}>
              <Flag code={c.code} />
              {c.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
      <FieldError>{tk('validation.required')}</FieldError>
    </ComboBox>
  )
}

/** Country flag from /public/flags (4:3), decorative: the country name is always beside it. */
function Flag({ code, className = '' }: { code: string; className?: string }) {
  return (
    <img
      src={`/flags/${code.toLowerCase()}.svg`}
      alt=""
      width={16}
      height={12}
      loading="lazy"
      className={`shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgb(0_0_0/0.08)] ${className}`}
    />
  )
}
