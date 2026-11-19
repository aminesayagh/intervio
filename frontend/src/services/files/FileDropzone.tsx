import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { accept, checkFile, type FilePurpose } from './purposes'

type Props = {
  purpose: FilePurpose
  /** Text of the call to action, for example "Upload a logo". */
  label: string
  /** Image already saved, shown until a new file is chosen. */
  currentUrl?: string | null
  /** A file passed the browser checks; null when the choice is cleared. */
  onChange: (file: File | null) => void
  /** Receives a translation key (files namespace) when the chosen file is refused. */
  onError: (key: string | null) => void
}

/** Drop or choose one file. Images show a preview; other files show their name. */
export function FileDropzone({
  purpose,
  label,
  currentUrl,
  onChange,
  onError,
}: Props) {
  const { t } = useTranslation('files')
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(
    () => () => void (preview && URL.revokeObjectURL(preview)),
    [preview],
  )

  function choose(chosen: File | undefined) {
    if (!chosen) return
    const invalid = checkFile(purpose, chosen)
    onError(invalid)
    if (invalid) return
    setFile(chosen)
    setPreview(
      chosen.type.startsWith('image/') ? URL.createObjectURL(chosen) : null,
    )
    onChange(chosen)
  }

  function drop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    choose(event.dataTransfer.files[0])
  }

  const image = preview ?? (file ? null : currentUrl)
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={accept(purpose)}
        className="hidden"
        onChange={(e) => choose(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={`flex h-40 w-full flex-col items-center justify-center gap-2 rounded-[var(--field-radius)] border border-dashed bg-surface ${dragging ? 'border-accent' : 'border-border'}`}
      >
        {image && (
          <img
            src={image}
            alt=""
            className="max-h-24 max-w-[60%] object-contain"
          />
        )}
        {file && !preview && <span>{file.name}</span>}
        <span className="underline underline-offset-4">
          {file || currentUrl ? t('chooseAnother') : label}
        </span>
      </button>
    </>
  )
}
