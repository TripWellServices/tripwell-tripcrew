const MONTH_MAP: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toYmd(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const probe = new Date(`${y}-${pad2(mo)}-${pad2(d)}T12:00:00.000Z`)
  if (Number.isNaN(probe.getTime())) return null
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() + 1 !== mo ||
    probe.getUTCDate() !== d
  ) {
    return null
  }
  return `${y}-${pad2(mo)}-${pad2(d)}`
}

function inferYearForMonthDay(month: number, day: number, ref = new Date()): number {
  const refY = ref.getFullYear()
  const refM = ref.getMonth() + 1
  const refD = ref.getDate()
  if (month > refM || (month === refM && day >= refD)) return refY
  return refY + 1
}

/** Parse flexible date strings to YYYY-MM-DD (UTC calendar day). */
export function parseFlexibleDateOnly(
  v: unknown,
  refDate: Date = new Date()
): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return toYmd(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const named =
    s.match(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/i
    ) ?? null
  if (named) {
    const mo = MONTH_MAP[named[1].toLowerCase()]
    const day = Number(named[2])
    const yRaw = named[3]
    const y = yRaw ? Number(yRaw) : inferYearForMonthDay(mo, day, refDate)
    return toYmd(y, mo, day)
  }

  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  return toYmd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/** API/client date string → Date at UTC noon (stable TripDay seeding). */
export function parseIncomingTripDate(raw: string): Date {
  const ymd = parseFlexibleDateOnly(raw)
  if (ymd) return new Date(`${ymd}T12:00:00.000Z`)
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
  return d
}

export function dateOnlyToNoonISO(ymd: string): string {
  return `${ymd}T12:00:00.000Z`
}
