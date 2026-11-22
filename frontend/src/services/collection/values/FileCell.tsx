import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatSize } from '../../files'
import {
  Button,
  DropZone,
  FileTrigger,
  Icon,
  Show,
  Variant,
} from '../../ui-kit'
import type { FileField, StoredFile } from '../definition'

/** The kinds of files a file field takes by default, as the files service does. */
const DOCUMENTS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'xlsx',
  'xls',
  'csv',
  'docx',
  'doc',
  'pptx',
  'ppt',
]

/** "2 files", or "—": a file value in the table (a click opens the record). */
export function FileCount({ files }: { files: StoredFile[] }) {
  const { t } = useTranslation('collection')
  return (
    <Show
      as="span"
      when={files.length > 0}
      fallback={<span className="text-muted">—</span>}
    >
      {t('fields.files', { count: files.length })}
    </Show>
  )
}

/** The files as a list: each opens in a new tab; `onRemove` adds a remove button. */
export function FileList({
  files,
  src,
  onRemove,
}: {
  files: StoredFile[]
  src: (file: StoredFile) => string
  onRemove?: (file: StoredFile) => void
}) {
  const { t } = useTranslation('collection')
  return (
    <ul className="flex flex-col">
      {files.map((file) => (
        <li
          key={file.id}
          className="group/file flex min-w-0 items-center gap-2 py-1"
        >
          <Icon name="lucide/file" size={14} className="text-muted" />
          <a
            href={src(file)}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 truncate underline decoration-border underline-offset-2 hover:decoration-foreground"
          >
            {file.name}
          </a>
          <span className="shrink-0 text-xs text-muted">
            {formatSize(file.sizeBytes)}
          </span>
          <Show as="span" when={onRemove} className="ms-auto flex">
            {(remove) => (
              <button
                type="button"
                aria-label={t('fields.removeFile', { name: file.name })}
                onClick={() => remove(file)}
                className="flex cursor-pointer rounded-[var(--field-radius)] p-1 text-muted opacity-0 outline-none group-hover/file:opacity-100 hover:bg-default hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-foreground"
              >
                <Icon name="lucide/x" size={12} />
              </button>
            )}
          </Show>
        </li>
      ))}
    </ul>
  )
}

/**
 * Files attached to the record (spec 7.3.0): in the panel, the list with a remove
 * button on each, "+ Add files" (several at once), and files can be dropped on it.
 * Each file is checked (type, size), the good ones are uploaded with the
 * definition's `upload`, then saved together; a refused one is reported (decision
 * 132). In the table the count shows, and a click opens the record.
 */
export function FileCell<T>({
  record,
  edit,
  label,
  save,
  look = 'cell',
  onInvalid,
}: {
  record: T
  edit: FileField<T>
  label: string
  save: (patch: Partial<T>) => Promise<void>
  look?: 'cell' | 'panel'
  onInvalid?: (reason: string) => void
}) {
  const { t } = useTranslation('collection')
  const [busy, setBusy] = useState(false)
  const files = edit.value(record)
  const extensions = edit.extensions ?? DOCUMENTS
  const maxMb = edit.maxMb ?? 10

  async function add(chosen: File[]) {
    const refused: string[] = []
    const good = chosen.filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!extensions.includes(extension))
        refused.push(t('fields.fileType', { name: file.name }))
      else if (file.size > maxMb * 1024 * 1024)
        refused.push(t('fields.fileSize', { name: file.name, size: maxMb }))
      else return true
      return false
    })
    if (good.length > 0) {
      setBusy(true)
      try {
        const uploaded = await Promise.all(
          good.map((file) => edit.upload(file)),
        )
        await save(edit.patch([...files, ...uploaded])).catch(() => {}) // the save reports its refusal
      } catch {
        refused.push(t('fields.uploadFailed'))
      } finally {
        setBusy(false)
      }
    }
    // After the save (a saved value clears its messages, and these must stay), in one
    // message: several would replace each other, as they are about the same value.
    if (refused.length > 0) onInvalid?.(refused.join(' '))
  }
  const remove = (file: StoredFile) =>
    void save(edit.patch(files.filter((f) => f.id !== file.id))).catch(() => {})

  return (
    <Variant
      as="span"
      className="block min-w-0"
      value={look}
      views={{
        // In the table: the count; a click opens the record.
        cell: () => <FileCount files={files} />,
        panel: () => (
          <DropZone
            aria-label={label}
            getDropOperation={() => 'copy'}
            onDrop={async (event) => {
              const dropped = await Promise.all(
                event.items
                  .filter((item) => item.kind === 'file')
                  .map((item) =>
                    (item as { getFile: () => Promise<File> }).getFile(),
                  ),
              )
              void add(dropped)
            }}
            className={busy ? 'opacity-50' : undefined}
          >
            <FileList files={files} src={edit.src} onRemove={remove} />
            <FileTrigger
              allowsMultiple
              acceptedFileTypes={extensions.map((e) => `.${e}`)}
              onSelect={(list) => list && void add([...list])}
            >
              <Button
                look="ghost"
                size="sm"
                isDisabled={busy}
                className="-ms-3 mt-1"
              >
                {t('fields.addFiles')}
              </Button>
            </FileTrigger>
          </DropZone>
        ),
      }}
    />
  )
}
