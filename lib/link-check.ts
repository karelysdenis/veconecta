export type LinkStatus = 'ok' | 'broken' | 'unknown'

const USER_AGENT = 'Mozilla/5.0 (compatible; VeConectaLinkCheck/1.0)'

async function attemptFetch(url: string, method: 'HEAD' | 'GET', timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Live check of a single URL. HEAD first (cheap); some servers reject HEAD
 * with 405, so a GET is attempted before giving up. Timeouts and network
 * errors resolve to "unknown", not "broken" — a transient failure on the
 * destination site shouldn't make a resource look dead.
 */
export async function checkUrl(url: string, timeoutMs = 5000): Promise<LinkStatus> {
  try {
    let response = await attemptFetch(url, 'HEAD', timeoutMs)
    if (response.status === 405) {
      response = await attemptFetch(url, 'GET', timeoutMs)
    }
    return response.ok ? 'ok' : 'broken'
  } catch {
    return 'unknown'
  }
}
