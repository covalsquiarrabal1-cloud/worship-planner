// Calculate week number for a given date
// Rules:
// - Week goes Monday to Sunday
// - Week 1 = from day 1 of month to the first Sunday
// - Last week absorbs everything until last Sunday of the month
// - Days after last Sunday also go to last week
export function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr + 'T12:00:00')
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  // Find the last Sunday of the month
  const lastDay = new Date(year, month + 1, 0).getDate()
  let lastSunday = lastDay
  while (new Date(year, month, lastSunday).getDay() !== 0) lastSunday--

  // Find the first Sunday of the month (end of week 1)
  let firstSunday = 1
  while (new Date(year, month, firstSunday).getDay() !== 0) firstSunday++

  // Number of Sundays in the month
  const sundaysCount = Math.floor((lastSunday - firstSunday) / 7) + 1

  // Total weeks = sundaysCount - 1 (last two Sundays' weeks merge)
  const totalWeeks = Math.max(sundaysCount - 1, 1)

  // Week 1: day 1 to firstSunday
  if (day <= firstSunday) return 1

  // For subsequent weeks
  const weeksSinceFirst = Math.ceil((day - firstSunday) / 7)
  const weekNum = weeksSinceFirst + 1

  // Cap at totalWeeks (last week absorbs remainder)
  return Math.min(weekNum, totalWeeks)
}
