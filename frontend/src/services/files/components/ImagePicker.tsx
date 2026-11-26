import { Button } from '@heroui/react'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { uploadErrorKey, uploadFile } from '../api'
import { accept, checkFile, FILE_PURPOSES, type FilePurpose } from '../purposes'
import { notify } from '../../notifications'

type Props = {
  purpose: FilePurpose
  label: string
  /** The saved image, or null. */
  src: string | null
  /** Shown in the square when there is no image (an initial, or nothing). */
  fallback?: ReactNode
  uploadLabel: string
  removeLabel: string
  /** Saves the uploaded file (by its id) as the image. */
  onUploaded: (fileId: string) => Promise<unknown>
  /** Removes the image; the Remove button shows only when given. */
  onRemove?: () => Promise<unknown>
}

/** A square image with "Upload" and "Remove": the file is uploaded, then saved at once. */
export function ImagePicker({
  purpose,
  label,
  src,
  fallback,
  uploadLabel,
  removeLabel,
  onUploaded,
  onRemove,
}: Props) {
  const { t } = useTranslation('files')
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setPending(true)
    try {
      await action()
    } catch (e) {
      notify({
        tone: 'error',
        text: t(uploadErrorKey(e)),
        key: 'ImagePicker:ImagePicker',
      })
    } finally {
      setPending(false)
    }
  }

  function choose(file: File | undefined) {
    if (input.current) input.current.value = '' // the same file can be chosen again
    if (!file) return
    const invalid = checkFile(purpose, file)
    if (invalid)
      return notify({
        tone: 'error',
        text: t(invalid),
        key: 'ImagePicker:ImagePicker',
      })
    void run(async () => onUploaded((await uploadFile(purpose, file)).id))
  }

  const rules = FILE_PURPOSES[purpose]
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[var(--field-radius)] bg-default text-xl font-medium">
          {src ? (
            <img src={src} alt="" className="size-full object-cover" />
          ) : (
            fallback
          )}
        </span>
        <Button
          variant="secondary"
          isPending={pending}
          onPress={() => input.current?.click()}
        >
          {uploadLabel}
        </Button>
        {onRemove && (
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => void run(onRemove)}
          >
            {removeLabel}
          </button>
        )}
        <input
          ref={input}
          type="file"
          hidden
          accept={accept(purpose)}
          onChange={(e) => choose(e.target.files?.[0])}
        />
      </div>
      <p className="text-xs text-muted">
        {t('imageRules', {
          types: rules.extensions
            .filter((e) => e !== 'jpeg')
            .map((e) => e.toUpperCase())
            .join(t('or')),
          size: rules.maxMb,
        })}
      </p>
    </div>
  )
}
