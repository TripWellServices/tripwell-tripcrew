const LOWERCASE_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'via',
])

export function isUnitedStates(country: string | null | undefined): boolean {
  const c = country?.trim().toLowerCase()
  if (!c) return false
  return c === 'united states' || c === 'usa' || c === 'us' || c === 'u.s.a.'
}

export function destinationLabel(input: {
  city?: string | null
  state?: string | null
  country?: string | null
}): string {
  const city = input.city?.trim()
  if (!city) return ''
  if (isUnitedStates(input.country)) {
    const state = input.state?.trim()
    return state ? `${city}, ${state}` : city
  }
  return city
}

/** Title-case with "Trip to" phrasing preserved. */
export function formatTripTitle(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const tripToMatch = trimmed.match(/^(.+?\s+Trip)\s+to\s+(.+)$/i)
  if (tripToMatch) {
    const prefix = titleCaseWords(tripToMatch[1])
    const dest = titleCaseWords(tripToMatch[2])
    return `${prefix} to ${dest}`
  }

  if (/\bTrip$/i.test(trimmed)) {
    return titleCaseWords(trimmed)
  }

  return titleCaseWords(trimmed)
}

function titleCaseWords(text: string): string {
  return text
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && LOWERCASE_WORDS.has(lower)) return lower
      if (word.includes('-')) {
        return word
          .split('-')
          .map((part) => capitalize(part))
          .join('-')
      }
      return capitalize(word)
    })
    .join(' ')
}

function capitalize(word: string): string {
  if (!word) return word
  if (word === word.toUpperCase() && word.length <= 4) return word
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

export function inferConcertTripTitle(input: {
  concertName: string
  city?: string | null
  state?: string | null
  country?: string | null
}): string {
  const name = input.concertName.trim()
  const dest = destinationLabel(input)
  if (!name) {
    return dest ? formatTripTitle(`Trip to ${dest}`) : 'Trip'
  }
  const cityOnly = input.city?.trim().toLowerCase()
  if (cityOnly && name.toLowerCase().includes(cityOnly)) {
    return formatTripTitle(`${name} Trip`)
  }
  if (!dest) return formatTripTitle(name)
  return formatTripTitle(`${name} Trip to ${dest}`)
}
