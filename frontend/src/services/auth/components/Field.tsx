import { Description, FieldError, Input, Label, TextField } from '@heroui/react'
import { useTranslation } from 'react-i18next'

type Props = {
  name: string
  label: string
  type?: 'text' | 'email' | 'password'
  autoComplete?: string
  help?: string
  value: string
  onChange: (value: string) => void
  /** Returns a translation key when the value is invalid. */
  check?: (value: string) => string | null
  /** Error shown from outside the field, as a translation key. */
  error?: string | null
}

/** A labelled text field whose checks show translated messages. */
export function Field({
  name,
  label,
  type = 'text',
  autoComplete,
  help,
  value,
  onChange,
  check,
  error,
}: Props) {
  const { t } = useTranslation('auth')
  return (
    <TextField
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      validate={check ? (v) => (check(v) ? t(check(v)!) : null) : undefined}
      isInvalid={error ? true : undefined}
      fullWidth
    >
      <Label>{label}</Label>
      <Input />
      {help && <Description>{help}</Description>}
      <FieldError>{error ? t(error) : undefined}</FieldError>
    </TextField>
  )
}
