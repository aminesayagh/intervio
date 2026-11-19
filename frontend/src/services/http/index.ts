/** Error sent by the backend: an HTTP status and an `ERROR_...` key the UI translates. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

type Body =
  { json: unknown } | { form: Record<string, string> } | { file: FormData }

function csrfToken() {
  return document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)?.[1]
}

/**
 * Calls the backend with the session cookie and Spring Security's CSRF header.
 * Returns the parsed JSON body, or undefined for an empty response.
 */
export async function api<T = void>(
  path: string,
  options: { method?: string; body?: Body } = {},
): Promise<T> {
  const method = options.method ?? (options.body ? 'POST' : 'GET')
  const headers: Record<string, string> = {}
  let body: BodyInit | undefined
  if (method !== 'GET') {
    // The CSRF cookie is set on the first backend response.
    if (!csrfToken())
      await fetch('/api/auth/me', { credentials: 'same-origin' })
    headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken() ?? '')
  }
  if (options.body && 'json' in options.body) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body.json)
  } else if (options.body && 'file' in options.body) {
    body = options.body.file // the browser sets the multipart Content-Type
  } else if (options.body) {
    body = new URLSearchParams(options.body.form)
  }

  const response = await fetch(path, {
    method,
    headers,
    body,
    credentials: 'same-origin',
  })
  const text = await response.text()
  const data = text ? JSON.parse(text) : undefined
  if (!response.ok) {
    throw new ApiError(response.status, data?.code ?? 'ERROR_UNKNOWN')
  }
  return data as T
}
