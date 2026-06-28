export const SLUG_TO_ISO: Record<string, string> = {
  spain: 'es',
  usa: 'us',
  colombia: 'co',
  brazil: 'br',
  argentina: 'ar',
  peru: 'pe',
  chile: 'cl',
  mexico: 'mx',
  ecuador: 'ec',
  france: 'fr',
  italy: 'it',
  germany: 'de',
  portugal: 'pt',
  panama: 'pa',
  uruguay: 'uy',
  venezuela: 've',
}

export function flagUrl(slug: string, size: 'w40' | 'w80' = 'w40'): string | null {
  const iso = SLUG_TO_ISO[slug]
  return iso ? `https://flagcdn.com/${size}/${iso}.png` : null
}
