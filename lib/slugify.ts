export function cityToSlug(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const VIRTUAL_CITIES = new Set(['nacional', 'national'])

export function isVirtualCity(city: string | null): boolean {
  if (!city) return true
  return VIRTUAL_CITIES.has(city.toLowerCase())
}
