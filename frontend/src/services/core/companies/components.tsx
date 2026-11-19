import { ComboBox, FieldError, Input, Label, ListBox } from '@heroui/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '../../navigation'
import { Title } from '../../ui-kit'
import { countries } from './countries'

/** "Step X of 3" above the step's title. */
export function StepTitle({
  step,
  children,
}: {
  step: number
  children: string
}) {
  const { t } = useTranslation('companies')
  return (
    <>
      <p className="mb-1 text-xs text-muted">{t('step', { step })}</p>
      <Title>{children}</Title>
    </>
  )
}

/** "Back" on the left and, for optional steps, "Skip" on the right. */
export function StepLinks({ back, skip }: { back: string; skip?: () => void }) {
  const { t } = useTranslation('companies')
  return (
    <div className="mt-4 flex items-center justify-between">
      <Link href={back}>{t('back')}</Link>
      {skip && (
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={skip}
        >
          {t('skip')}
        </button>
      )}
    </div>
  )
}

/** Country of registration: a searchable list with flags (onboarding and Settings). */
export function CountryField({
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
