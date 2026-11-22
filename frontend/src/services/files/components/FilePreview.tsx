import { Drawer } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fileUrl } from '../api'

export type PreviewFile = {
  id: string
  name: string
  contentType: string
  sizeBytes: number
}

/**
 * A drawer from the right showing only the file: a PDF's pages drawn by pdf.js, or an image.
 * The server always sends files as downloads in a sandbox, so the file is fetched and drawn
 * in the page instead of being embedded.
 */
export function FilePreview({
  file,
  onClose,
}: {
  file: PreviewFile | null
  onClose: () => void
}) {
  return (
    <Drawer.Backdrop
      isOpen={file !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <Drawer.Content placement="right">
        <Drawer.Dialog className="flex h-full w-[min(760px,100vw)] max-w-full flex-col p-0">
          {/* An empty line with the close button; the name is only for screen readers. */}
          <Drawer.Header className="flex flex-row items-center justify-end px-4 py-2">
            <Drawer.Heading className="sr-only">{file?.name}</Drawer.Heading>
            <Drawer.CloseTrigger />
          </Drawer.Header>
          <Drawer.Body className="min-h-0 flex-1 overflow-auto bg-default p-0">
            {file && <Content key={file.id} file={file} />}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

function Content({ file }: { file: PreviewFile }) {
  const { t } = useTranslation('files')
  const [state, setState] = useState<'loading' | 'done' | 'failed'>('loading')
  const [image, setImage] = useState<string | null>(null)
  const pages = useRef<HTMLDivElement>(null)
  const isPdf = file.contentType === 'application/pdf'
  const isImage = file.contentType.startsWith('image/')

  useEffect(() => {
    if (!isPdf && !isImage) return
    let cancelled = false
    let objectUrl: string | null = null
    ;(async () => {
      const response = await fetch(fileUrl(file.id), {
        credentials: 'same-origin',
      })
      if (!response.ok) throw new Error(String(response.status))
      if (isImage) {
        objectUrl = URL.createObjectURL(await response.blob())
        if (!cancelled) setImage(objectUrl)
      } else {
        await drawPdf(
          await response.arrayBuffer(),
          pages.current!,
          () => cancelled,
        )
      }
      if (!cancelled) setState('done')
    })().catch(() => !cancelled && setState('failed'))
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file.id, isPdf, isImage])

  if (!isPdf && !isImage)
    return <p className="p-5 text-muted">{t('previewUnavailable')}</p>
  return (
    <>
      {state === 'loading' && (
        <p className="p-5 text-muted">{t('previewLoading')}</p>
      )}
      {state === 'failed' && (
        <p className="p-5 text-muted">{t('previewFailed')}</p>
      )}
      {image && (
        <div className="flex min-h-full items-center justify-center p-4">
          <img
            src={image}
            alt={file.name}
            className="max-w-full object-contain"
          />
        </div>
      )}
      <div ref={pages} className="flex flex-col items-center gap-3 p-4" />
    </>
  )
}

/** Draws every page as a canvas the width of the drawer; no viewer around it. */
async function drawPdf(
  data: ArrayBuffer,
  into: HTMLElement,
  cancelled: () => boolean,
) {
  // Loaded on first use: the engine is large and only previews need it.
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data })
  const pdf = await task.promise
  const width = into.clientWidth - 32 // the container's padding
  const ratio = window.devicePixelRatio || 1
  for (let n = 1; n <= pdf.numPages && !cancelled(); n++) {
    const page = await pdf.getPage(n)
    const viewport = page.getViewport({
      scale: width / page.getViewport({ scale: 1 }).width,
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width * ratio)
    canvas.height = Math.floor(viewport.height * ratio)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.className = 'bg-white shadow-sm'
    into.append(canvas)
    await page.render({
      canvas,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
    }).promise
  }
  await task.destroy() // frees the worker's copy of the document
}
