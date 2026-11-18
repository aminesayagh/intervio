import {
  Description,
  FieldError,
  Input,
  InputGroup,
  Label,
  TextField,
} from '@heroui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  name: string
  label: string
  type?: 'text' | 'email' | 'password'
  autoComplete?: string
  help?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  /** Returns a translation key when the value is invalid. */
  check?: (value: string) => string | null
  /** Error shown from outside the field, as a translation key. */
  error?: string | null
}

/** A labelled text field whose checks show translated messages. Password fields get a show/hide button. */
export function Field({
  name,
  label,
  type = 'text',
  autoComplete,
  help,
  placeholder,
  value,
  onChange,
  check,
  error,
}: Props) {
  const { t } = useTranslation('auth')
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  return (
    <TextField
      name={name}
      type={isPassword && shown ? 'text' : type}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      // Empty values are caught by isRequired, which only reports after a submit attempt;
      // the other checks run once something is typed.
      isRequired={check !== undefined}
      validate={
        check ? (v) => (v && check(v) ? t(check(v)!) : null) : undefined
      }
      isInvalid={error ? true : undefined}
      fullWidth
    >
      <Label>{label}</Label>
      {isPassword ? (
        <InputGroup>
          <InputGroup.Input placeholder={placeholder} />
          <InputGroup.Suffix>
            <button
              type="button"
              className="flex text-muted hover:text-foreground"
              aria-label={t(shown ? 'password.hide' : 'password.show')}
              aria-pressed={shown}
              onClick={() => setShown(!shown)}
            >
              <EyeIcon crossed={shown} />
            </button>
          </InputGroup.Suffix>
        </InputGroup>
      ) : (
        <Input placeholder={placeholder} />
      )}
      {help && <Description>{help}</Description>}
      <FieldError>
        {error
          ? t(error)
          : (v) =>
              v.validationDetails.valueMissing
                ? t('validation.required')
                : v.validationErrors.join(' ')}
      </FieldError>
    </TextField>
  )
}

/** Open eye: show the password. Crossed eye: hide it again. */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <path d="M3 3l18 18" />}
    </svg>
  )
}
