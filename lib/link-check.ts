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

// Bot-protection/rate-limiting signatures (Cloudflare and similar WAFs), as
// opposed to statuses that actually mean the content is gone (404, 410, 5xx).
// A 403/429 on both the HEAD and the GET retry proves our request looked
// like a bot to the destination site, not that the resource is dead.
const AMBIGUOUS_BLOCK_STATUSES = new Set([403, 429])

/**
 * Live check of a single URL. HEAD first (cheap); many sites reject or block
 * HEAD (405, or a bot-protection 403) even though GET works fine, so any
 * non-ok HEAD response gets a GET retry before concluding the link is dead.
 * Timeouts and network errors resolve to "unknown", not "broken" — a
 * transient failure on the destination site shouldn't make a resource look dead.
 * Same reasoning applies when both attempts come back 403/429: that's a bot
 * challenge, not evidence the content was removed.
 */
export async function checkUrl(url: string, timeoutMs = 5000): Promise<LinkStatus> {
  try {
    let response = await attemptFetch(url, 'HEAD', timeoutMs)
    if (!response.ok) {
      response = await attemptFetch(url, 'GET', timeoutMs)
    }
    if (response.ok) return 'ok'
    return AMBIGUOUS_BLOCK_STATUSES.has(response.status) ? 'unknown' : 'broken'
  } catch {
    return 'unknown'
  }
}
