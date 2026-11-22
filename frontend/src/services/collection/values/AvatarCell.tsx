import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, cn, Show, Variant } from '../../ui-kit'
import type { AvatarField, StoredFile } from '../definition'

/** The picture, or an empty frame: 24 px in the table, 64 px in the panel. */
export function AvatarImage<T>({
  edit,
  file,
  look,
}: {
  edit: AvatarField<T>
  file: StoredFile | null
  look: 'cell' | 'panel'
}) {
  const size = look === 'cell' ? 'size-6' : 'size-16'
  const shape =
    edit.shape === 'square' ? 'rounded-[var(--field-radius)]' : 'rounded-full'
  return (
    <Show
      as="span"
      when={file}
      className="flex shrink-0"
      fallback={
        <span className={cn('block shrink-0 bg-default', size, shape)} />
      }
    >
      {(shown) => (
        <img
          src={edit.src(shown)}
          alt=""
          className={cn('shrink-0 object-cover', size, shape)}
        />
      )}
    </Show>
  )
}

/**
 * A picture uploaded for the record (spec 7.3.0): in the table a click on it opens
 * the file chooser; in the panel, Upload (or Replace) and Remove. The file is
 * checked first (type, size), then uploaded with the definition's `upload`, then
 * saved; a refused or failed one is reported (decision 132).
 */
export function AvatarCell<T>({
  record,
  edit,
  label,
  save,
  look = 'cell',
  onInvalid,
}: {
  record: T
  edit: AvatarField<T>
  label: string
  save: (patch: Partial<T>) => Promise<void>
  look?: 'cell' | 'panel'
  onInvalid?: (reason: string) => void
}) {
  const { t } = useTranslation('collection')
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const file = edit.value(record)
  const extensions = edit.extensions ?? ['png', 'jpg', 'jpeg']
  const maxMb = edit.maxMb ?? 2

  async function pick(chosen: File | undefined) {
    if (input.current) input.current.value = '' // the same file can be chosen again
    if (!chosen) return
    const extension = chosen.name.split('.').pop()?.toLowerCase() ?? ''
    if (!extensions.includes(extension))
      return onInvalid?.(
        t('fields.pictureType', { types: extensions.join(', ').toUpperCase() }),
      )
    if (chosen.size > maxMb * 1024 * 1024)
      return onInvalid?.(t('fields.pictureSize', { size: maxMb }))
    setBusy(true)
    try {
      const uploaded = await edit.upload(chosen)
      await save(edit.patch(uploaded)).catch(() => {}) // the save reports its own refusal
    } catch {
      onInvalid?.(t('fields.uploadFailed'))
    } finally {
      setBusy(false)
    }
  }

  const chooser = (
    <input
      ref={input}
      type="file"
      hidden
      aria-label={t('fields.upload', { label })}
      accept={extensions.map((e) => `.${e}`).join(',')}
      onChange={(event) => void pick(event.target.files?.[0])}
    />
  )
  return (
    <Variant
      as="span"
      className="flex min-w-0"
      value={look}
      views={{
        // In the table: the picture is the button.
        cell: () => (
          <>
            <button
              type="button"
              aria-label={t('fields.upload', { label })}
              aria-busy={busy || undefined}
              onClick={() => input.current?.click()}
              className={cn(
                'flex cursor-pointer rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                busy && 'opacity-50',
              )}
            >
              <AvatarImage edit={edit} file={file} look="cell" />
            </button>
            {chooser}
          </>
        ),
        // In the panel: the picture, Upload or Replace, and Remove.
        panel: () => (
          <span className={cn('flex items-center gap-3', busy && 'opacity-50')}>
            <AvatarImage edit={edit} file={file} look="panel" />
            <Button
              look="ghost"
              size="sm"
              isDisabled={busy}
              onPress={() => input.current?.click()}
            >
              {t(file ? 'fields.replace' : 'fields.uploadShort')}
            </Button>
            <Show as="span" when={file}>
              <Button
                look="ghost"
                size="sm"
                isDisabled={busy}
                onPress={() => void save(edit.patch(null)).catch(() => {})}
              >
                {t('fields.remove')}
              </Button>
            </Show>
            {chooser}
          </span>
        ),
      }}
    />
  )
}
