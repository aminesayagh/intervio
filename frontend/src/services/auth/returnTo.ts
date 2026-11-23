/**
 * The page a logged-out visitor asked for, kept while they log in so they land on it after.
 * Saved in localStorage so every way of logging in (password, Google, email link, even in
 * another tab) finds it. It works once and expires after an hour (decision 140).
 */
const KEY = 'intervio.returnTo'
const LIFETIME = 60 * 60 * 1000

export function saveReturnTo(to: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ to, at: Date.now() }))
  } catch {
    // storage blocked (private window): the user lands on the dashboard instead
  }
}

/** The saved page if it has not expired; reading does not use it up (see dropReturnTo). */
export function peekReturnTo(): string | null {
  try {
    const { to, at } = JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? {}
    return typeof to === 'string' && Date.now() - at < LIFETIME ? to : null
  } catch {
    return null
  }
}

export function dropReturnTo() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to drop
  }
}
