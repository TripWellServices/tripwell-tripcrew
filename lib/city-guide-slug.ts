/** URL-safe slug from city identity; not guaranteed unique — caller should disambiguate. */
export function baseSlugFromCity(name: string, state: string | null | undefined, country: string | null | undefined) {
  const parts = [name, state || undefined, country || undefined]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return parts || 'destination'
}
