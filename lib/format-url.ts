/** Host + path for display, dropping query/hash (where tracking params like utm_ and fbclid live). */
export function cleanUrlDisplay(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    const path = u.pathname === '/' ? '' : u.pathname
    const display = `${host}${path}`
    return display.length > 60 ? `${display.slice(0, 57)}…` : display
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

/** Bare hostname for compact card display (no path, no query/hash). */
export function urlHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }
}
