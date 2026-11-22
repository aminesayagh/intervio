import { useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FormError, Icon } from '../../ui-kit'
import {
  formatSize,
  uploadErrorKey,
  uploadFile,
  type UploadedFile,
} from '../api'
import { accept, checkFile, FILE_PURPOSES } from '../purposes'

/**
 * Drop or choose several documents: each is uploaded at once (purpose document) and listed with
 * a remove button. The parent keeps the uploaded files and sends their ids with its form.
 */
export function DocumentsField({
  label,
  value,
  onChange,
  onPendingChange,
}: {
  label: string
  value: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
  /** True while uploads are running, so the form can wait. */
  onPendingChange?: (pending: boolean) => void
}) {
  const { t } = useTranslation('files')
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(0)
  const [dragging, setDragging] = useState(false)

  async function add(chosen: File[]) {
    if (input.current) input.current.value = ''
    setError(null)
    const valid = chosen.filter((file) => {
      const invalid = checkFile('document', file)
      if (invalid) setError(invalid)
      return !invalid
    })
    if (!valid.length) return
    setUploading((n) => n + valid.length)
    onPendingChange?.(true)
    const uploaded: UploadedFile[] = []
    for (const file of valid) {
      try {
        uploaded.push(await uploadFile('document', file))
      } catch (e) {
        setError(uploadErrorKey(e))
      }
    }
    setUploading((n) => n - valid.length)
    onPendingChange?.(false)
    onChange([...value, ...uploaded])
  }

  function drop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    void add(Array.from(event.dataTransfer.files))
  }

  const rules = FILE_PURPOSES.document
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{label}</span>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={`flex h-20 flex-col items-center justify-center gap-1 rounded-[var(--field-radius)] border border-dashed text-muted hover:text-foreground ${
          dragging ? 'border-primary bg-default' : 'border-border bg-surface'
        }`}
      >
        <span>{uploading ? t('uploading') : t('dropOrBrowse')}</span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={accept('document')}
        onChange={(e) => void add(Array.from(e.target.files ?? []))}
      />
      <p className="text-xs text-muted">
        {t('documentRules', { size: rules.maxMb })}
      </p>
      <FormError message={error && t(error)} />
      {value.length > 0 && (
        <ul className="mt-1 flex flex-col">
          {value.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 border-b border-border py-2"
            >
              <Icon name="Document" size={16} className="text-muted" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted">
                {formatSize(file.sizeBytes)}
              </span>
              <button
                type="button"
                aria-label={t('removeFile', { name: file.name })}
                className="flex text-muted hover:text-foreground"
                onClick={() => onChange(value.filter((f) => f.id !== file.id))}
              >
                <Icon name="Close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
