export const DAY_PLAN_STEP_TYPES = [
  'drive',
  'hike',
  'lunch',
  'rest',
  'return',
  'arrive',
  'other',
] as const

export type DayPlanStepType = (typeof DAY_PLAN_STEP_TYPES)[number]

export interface DayPlanStep {
  time: string
  label: string
  notes?: string | null
  type: DayPlanStepType
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function normType(v: unknown): DayPlanStepType {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : ''
  if (DAY_PLAN_STEP_TYPES.includes(s as DayPlanStepType)) return s as DayPlanStepType
  if (s === 'meal') return 'lunch'
  return 'other'
}

export function normalizeDayPlanSteps(parsed: unknown): DayPlanStep[] {
  const root =
    parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  const raw = Array.isArray(root.steps) ? root.steps : Array.isArray(parsed) ? parsed : []
  const out: DayPlanStep[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const time = str(r.time ?? r.at)
    const label = str(r.label ?? r.title ?? r.activity)
    if (!time || !label) continue
    out.push({
      time,
      label,
      notes: str(r.notes ?? r.detail) || null,
      type: normType(r.type),
    })
  }
  return out
}
