import { useTranslation } from 'react-i18next'
import { cn, Icon, Show } from '../../ui-kit'
import type { LinkField, TextField } from '../definition'
import { EditableCell } from './EditableCell'

type Kind = LinkField<unknown>['type']

/** How each kind reads, checks and opens its value. */
const kinds: Record<
  Kind,
  {
    input: 'text' | 'url' | 'email' | 'tel'
    icon: string
    invalid: string
    href: (value: string) => string
    normalize: (value: string) => string
    valid: (value: string) => boolean
    shown: (value: string) => string
  }
> = {
  url: {
    input: 'url',
    icon: 'lucide/external-link',
    invalid: 'collection:fields.url',
    href: (value) => value,
    // "intervio.com" is a web address too: it gets https://.
    normalize: (value) =>
      value && !/^[a-z][a-z0-9+.-]*:/i.test(value) ? `https://${value}` : value,
    valid: (value) => {
      try {
        const url = new URL(value)
        return /^https?:$/.test(url.protocol) && url.hostname.includes('.')
      } catch {
        return false
      }
    },
    // The address without its scheme or a trailing slash.
    shown: (value) => value.replace(/^https?:\/\//, '').replace(/\/$/, ''),
  },
  email: {
    input: 'email',
    icon: 'lucide/mail',
    invalid: 'collection:fields.email',
    href: (value) => `mailto:${value}`,
    normalize: (value) => value,
    valid: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    shown: (value) => value,
  },
  location: {
    input: 'text',
    icon: 'lucide/map-pin',
    invalid: '',
    // Any address is accepted; the map finds it (OpenStreetMap, no key needed).
    href: (value) =>
      `https://www.openstreetmap.org/search?query=${encodeURIComponent(value)}`,
    normalize: (value) => value,
    valid: () => true,
    shown: (value) => value,
  },
  phone: {
    input: 'tel',
    icon: 'lucide/phone',
    invalid: 'collection:fields.phone',
    href: (value) => `tel:${value.replace(/[^\d+]/g, '')}`,
    normalize: (value) => value,
    valid: (value) =>
      /^\+?[\d\s().-]+$/.test(value) && value.replace(/\D/g, '').length >= 6,
    shown: (value) => value,
  },
}

/** A web page or a map opens in a new tab; an email or a call opens its app. */
const opensTab = (kind: Kind) => kind === 'url' || kind === 'location'

/** A URL, an email address, a phone number or a location as a link (the read view). */
export function LinkValue({ kind, value }: { kind: Kind; value: string }) {
  const rule = kinds[kind]
  return (
    <Show
      as="span"
      when={value}
      fallback={<span className="text-muted">—</span>}
    >
      <a
        href={rule.href(value)}
        target={opensTab(kind) ? '_blank' : undefined}
        rel={opensTab(kind) ? 'noreferrer' : undefined}
        className="truncate underline decoration-border underline-offset-2 hover:decoration-foreground"
      >
        {rule.shown(value)}
      </a>
    </Show>
  )
}

/**
 * A URL, an email address or a phone number edited in place (spec 7.3.0): the text
 * field with the right keyboard, checked when left (a refused one goes back, with a
 * message), and a small icon that opens it (in the table, under the pointer).
 */
export function LinkCell<T>({
  record,
  edit,
  label,
  namespace,
  save,
  look = 'cell',
  onInvalid,
}: {
  record: T
  edit: LinkField<T>
  label: string
  namespace: string
  save: (patch: Partial<T>) => Promise<void>
  look?: 'cell' | 'panel'
  onInvalid?: (reason: string) => void
}) {
  const { t } = useTranslation('collection')
  const rule = kinds[edit.type]
  const value = edit.value(record)
  const text: TextField<T> = {
    type: 'text',
    value: edit.value,
    patch: (typed) => edit.patch(rule.normalize(typed)),
    validate: (typed) =>
      typed && !rule.valid(rule.normalize(typed)) ? rule.invalid : undefined,
  }
  return (
    <span className="group/link flex min-w-0 items-center gap-1">
      <span className="min-w-0 flex-1">
        <EditableCell
          record={record}
          edit={text}
          label={label}
          namespace={namespace}
          save={save}
          look={look}
          inputType={rule.input}
          onInvalid={onInvalid}
        />
      </span>
      <Show as="span" when={value} className="flex shrink-0">
        <a
          href={rule.href(value)}
          target={opensTab(edit.type) ? '_blank' : undefined}
          rel={opensTab(edit.type) ? 'noreferrer' : undefined}
          aria-label={t('fields.open', { value: rule.shown(value) })}
          className={cn(
            'flex rounded-[var(--field-radius)] p-1 text-muted outline-none hover:bg-default hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground',
            look === 'cell' &&
              'opacity-0 group-focus-within/link:opacity-100 group-hover/link:opacity-100 focus-visible:opacity-100',
          )}
        >
          <Icon name={rule.icon} size={14} />
        </a>
      </Show>
    </span>
  )
}
