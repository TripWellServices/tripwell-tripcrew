import { format } from "date-fns"

export function computeTripMetadata(startDate: Date, endDate: Date) {
  const ms = endDate.getTime() - startDate.getTime()
  const daysTotal = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1

  const startMonth = format(startDate, "MMM")
  const endMonth   = format(endDate, "MMM")
  const startDay   = format(startDate, "d")
  const endDay     = format(endDate, "d")
  const startYear  = format(startDate, "yyyy")
  const endYear    = format(endDate, "yyyy")

  let dateRange = ""
  if (startYear !== endYear) {
    dateRange = `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`
  } else if (startMonth !== endMonth) {
    dateRange = `${startMonth} ${startDay} – ${endMonth} ${endDay}`
  } else {
    dateRange = `${startMonth} ${startDay}–${endDay}`
  }

  const month = startDate.getMonth() + 1
  let season = ""
  if (month >= 3 && month <= 5) season = "Spring"
  else if (month >= 6 && month <= 8) season = "Summer"
  else if (month >= 9 && month <= 11) season = "Fall"
  else season = "Winter"

  return { daysTotal, dateRange, season }
}

