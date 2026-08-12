// Calculate week number for a given date
// Rules:
// - Week goes Monday to Sunday
// - Week 1 = from day 1 of month to the first Sunday
// - Subsequent weeks are 7 days each (no merging)
export function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr + 'T12:00:00')
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  // Find the first Sunday of the month
  let firstSunday = 1
  while (new Date(year, month, firstSunday).getDay() !== 0) firstSunday++

  // Week 1: day 1 to firstSunday
  if (day <= firstSunday) return 1

  // Subsequent weeks
  return Math.ceil((day - firstSunday) / 7) + 1
}
