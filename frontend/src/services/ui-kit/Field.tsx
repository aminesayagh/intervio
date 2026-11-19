import {
  Description,
  FieldError,
  Input,
  InputGroup,
  Label,
  TextArea,
  TextField,
} from '@heroui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'

type Props = {
  name: string
  label: string
  type?: 'text' | 'email' | 'password' | 'date'
  /** A multi-line text area instead of a one-line input. */
  multiline?: boolean
  autoComplete?: string
  help?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  /** Returns a translation key when the value is invalid. */
  check?: (value: string) => string | null
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
  multiline = false,
}: Props) {
  const { t } = useTranslation('ui-kit')
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
      fullWidth
    >
      <Label>{label}</Label>
      {isPassword ? (
        <InputGroup>
          <InputGroup.Input placeholder={placeholder} />
          <InputGroup.Suffix className="border-s-0">
            <button
              type="button"
              className="flex text-muted hover:text-foreground"
              aria-label={t(shown ? 'password.hide' : 'password.show')}
              aria-pressed={shown}
              onClick={() => setShown(!shown)}
            >
              <Icon name={shown ? 'Eye-slash' : 'Eye'} size={18} />
            </button>
          </InputGroup.Suffix>
        </InputGroup>
      ) : multiline ? (
        <TextArea placeholder={placeholder} rows={3} />
      ) : (
        <Input placeholder={placeholder} />
      )}
      {help && <Description>{help}</Description>}
      <FieldError>
        {(v) =>
          v.validationDetails.valueMissing
            ? t('validation.required')
            : v.validationErrors.join(' ')
        }
      </FieldError>
    </TextField>
  )
}
