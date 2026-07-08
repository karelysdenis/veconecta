import { localizeBare, localizeSuffixed } from '@/lib/locale-content'

type RankableResource = {
  name: string
  nameEn: string | null
  namePt: string | null
  nameFr: string | null
  nameDe: string | null
  notesEs: string | null
  notesEn: string | null
  notesPt: string | null
  notesFr: string | null
  notesDe: string | null
}

/**
 * Match tier for one resource: 0 is the best match, 5 means the query didn't
 * hit any name/notes field directly (it only matched via a country-name
 * search, handled separately by the caller). Uses the same locale fallback
 * rules as the UI (localizeBare/localizeSuffixed) so "does this match what
 * the visitor actually sees" and "what's rendered" never disagree.
 */
function tierFor(resource: RankableResource, query: string, locale: string): number {
  const q = query.toLowerCase()

  const displayName = localizeBare(resource, 'name', locale).toLowerCase()
  if (displayName.startsWith(q)) return 0
  if (displayName.includes(q)) return 1

  const allNames = [resource.name, resource.nameEn, resource.namePt, resource.nameFr, resource.nameDe]
  if (allNames.some((n) => n?.toLowerCase().includes(q))) return 2

  const displayNotes = (localizeSuffixed(resource, 'notes', locale) ?? '').toLowerCase()
  if (displayNotes.includes(q)) return 3

  const allNotes = [resource.notesEs, resource.notesEn, resource.notesPt, resource.notesFr, resource.notesDe]
  if (allNotes.some((n) => n?.toLowerCase().includes(q))) return 4

  return 5
}

/** Sorts search results by relevance tier (best first); stable — ties keep their input order. */
export function rankSearchResults<T extends RankableResource>(
  results: T[],
  query: string,
  locale: string,
): T[] {
  return results
    .map((resource) => ({ resource, tier: tierFor(resource, query, locale) }))
    .sort((a, b) => a.tier - b.tier)
    .map((scored) => scored.resource)
}
