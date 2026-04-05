/** Shared helpers for AttractionCard + TripExperienceCard. */

export function summarizeAttractionMetadata(meta: unknown): string[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return []
  const m = meta as Record<string, unknown>
  const lines: string[] = []
  const dur = m.duration_minutes
  if (typeof dur === 'number' && Number.isFinite(dur)) {
    lines.push(`About ${Math.round(dur)} min`)
  }
  const cost = m.cost
  if (cost && typeof cost === 'object' && !Array.isArray(cost)) {
    const c = cost as Record<string, unknown>
    const bits: string[] = []
    if (typeof c.adult_usd === 'number') bits.push(`adult $${c.adult_usd}`)
    if (typeof c.child_usd === 'number') bits.push(`child $${c.child_usd}`)
    if (typeof c.family_estimate_usd === 'number') {
      bits.push(`family ~$${c.family_estimate_usd}`)
    }
    if (bits.length) lines.push(bits.join(' · '))
  }
  const subItems = m.sub_items
  if (Array.isArray(subItems) && subItems.length > 0) {
    const labels = subItems
      .map((s) =>
        typeof s === 'string' ? s.trim() : typeof s === 'object' && s && 'name' in s ? String((s as { name?: unknown }).name ?? '').trim() : ''
      )
      .filter(Boolean)
    if (labels.length) {
      const head = labels.slice(0, 4).join(', ')
      lines.push(labels.length > 4 ? `Stops: ${head}…` : `Stops: ${head}`)
    }
  }
  const fit = m.tripwell_fit
  if (fit && typeof fit === 'object' && !Array.isArray(fit)) {
    const f = fit as Record<string, unknown>
    const tb = typeof f.time_block === 'string' ? f.time_block.trim() : ''
    if (tb) lines.push(tb)
    const eff =
      typeof f.effort_level === 'string' ? f.effort_level.trim() : ''
    if (eff && !tb) lines.push(`Effort: ${eff}`)
  }
  const jumps = m.jump_off_next_to
  if (Array.isArray(jumps) && jumps.length > 0) {
    const names = jumps
      .map((j) => {
        if (j && typeof j === 'object' && j !== null && 'name' in j) {
          return String((j as { name?: unknown }).name ?? '').trim()
        }
        return ''
      })
      .filter(Boolean)
    if (names.length) {
      const head = names.slice(0, 3).join(', ')
      lines.push(
        names.length > 3 ? `Near: ${head}…` : `Near: ${head}`
      )
    }
  }
  const nGoogle = m.google_user_ratings_total
  if (typeof nGoogle === 'number' && Number.isFinite(nGoogle)) {
    lines.push(`${Math.round(nGoogle)} Google reviews`)
  }
  const gh = m.google_opening_hours
  if (gh && typeof gh === 'object' && !Array.isArray(gh)) {
    const o = gh as Record<string, unknown>
    if (o.open_now === true) lines.push('Open now (per Google)')
    const wt = o.weekday_text
    if (Array.isArray(wt) && typeof wt[0] === 'string' && wt[0].trim()) {
      lines.push(wt[0].trim())
    }
  }
  if (
    typeof m.google_business_status === 'string' &&
    m.google_business_status !== 'OPERATIONAL'
  ) {
    lines.push(`Status: ${m.google_business_status.replace(/_/g, ' ')}`)
  }
  return lines
}

export function summarizeDiningMetadata(meta: unknown): string[] {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return []
  const m = meta as Record<string, unknown>
  const lines: string[] = []
  const ft = typeof m.food_type === 'string' ? m.food_type.trim() : ''
  if (ft) lines.push(ft)
  const ideal =
    typeof m.ideal_time === 'string' ? m.ideal_time.trim().replace(/_/g, ' ') : ''
  if (ideal) lines.push(ideal.charAt(0).toUpperCase() + ideal.slice(1))
  const cl = m.cost_level
  if (typeof cl === 'number' && Number.isFinite(cl)) {
    const n = Math.min(5, Math.max(1, Math.round(cl)))
    lines.push(`${'★'.repeat(n)}${'☆'.repeat(5 - n)} (${n}/5)`)
  }
  if (m.reservation_required === true) lines.push('Reservation recommended')
  const notes = typeof m.notes === 'string' ? m.notes.trim() : ''
  if (notes) lines.push(notes)
  const nGoogle = m.google_user_ratings_total
  if (typeof nGoogle === 'number' && Number.isFinite(nGoogle)) {
    lines.push(`${Math.round(nGoogle)} Google reviews`)
  }
  const gh = m.google_opening_hours
  if (gh && typeof gh === 'object' && !Array.isArray(gh)) {
    const o = gh as Record<string, unknown>
    if (o.open_now === true) lines.push('Open now (per Google)')
  }
  if (
    typeof m.google_business_status === 'string' &&
    m.google_business_status !== 'OPERATIONAL'
  ) {
    lines.push(`Status: ${m.google_business_status.replace(/_/g, ' ')}`)
  }
  return lines
}

export function googleMapsUrlFromMetadata(meta: unknown): string | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  const u = (meta as Record<string, unknown>).google_maps_url
  return typeof u === 'string' && u.startsWith('http') ? u : null
}
