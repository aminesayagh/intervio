import { File as FileIcon, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  addLook,
  Button,
  cn,
  DropZone,
  FileTrigger,
  Show,
  Variant,
} from '../../ui-kit'
import { checkFile, FILE_PURPOSES } from '../../files'
import type { FileField, StoredFile } from '../definition'

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
    <ul className="contents">
      {files.map((file) => (
        <li
          key={file.id}
          className="group/file flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-[var(--field-radius)] border border-border px-1.5"
        >
          <FileIcon size={14} className="text-muted" />
          <a
            href={src(file)}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 truncate underline decoration-border underline-offset-2 hover:decoration-foreground"
          >
            {file.name}
          </a>
          <Show as="span" when={onRemove} className="flex">
            {(remove) => (
              <button
                type="button"
                aria-label={t('fields.removeFile', { name: file.name })}
                onClick={() => remove(file)}
                className="-me-1 flex cursor-pointer rounded-[var(--field-radius)] p-0.5 text-muted opacity-0 outline-none group-hover/file:opacity-100 hover:bg-default hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-foreground"
              >
                <X size={12} />
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
 * button on each, "Add Files" (several at once), and files can be dropped on it.
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
  // The files service's rules for documents, unless the field gives its own (#73).
  const extensions = edit.extensions ?? FILE_PURPOSES.document.extensions
  const maxMb = edit.maxMb ?? FILE_PURPOSES.document.maxMb

  async function add(chosen: File[]) {
    const refused: string[] = []
    const good = chosen.filter((file) => {
      const problem = checkFile({ extensions, maxMb }, file)
      if (problem === 'errors.ERROR_FILE_TYPE')
        refused.push(t('fields.fileType', { name: file.name }))
      else if (problem)
        refused.push(t('fields.fileSize', { name: file.name, size: maxMb }))
      return !problem
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
            // Side by side, wrapping when the line is full; Add Files comes last.
            className={cn(
              'flex flex-wrap items-center gap-2',
              busy && 'opacity-50',
            )}
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
                className={addLook}
                data-wake
              >
                <Plus size={12} />
                {t('empty.add', { name: label })}
              </Button>
            </FileTrigger>
          </DropZone>
        ),
      }}
    />
  )
}
