import type { StoredFile } from '../definition'

/**
 * Uploads kept in memory, for the showcase and the tests (spec 15.2): the file
 * becomes a browser URL; sample files show a grey square with their initials.
 */
const urls = new Map<string, string>()

export async function memoryUpload(file: File): Promise<StoredFile> {
  const id = crypto.randomUUID()
  try {
    urls.set(id, URL.createObjectURL(file))
  } catch {
    // no object URLs (jsdom): the sample picture shows instead
  }
  return { id, name: file.name, contentType: file.type, sizeBytes: file.size }
}

export function memorySrc(file: StoredFile) {
  const initials = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 2)
  return (
    urls.get(file.id) ??
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#d9d8d0"/><text x="32" y="40" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#252522">${initials}</text></svg>`,
    )}`
  )
}
