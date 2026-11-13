// Recalculates week_number (Monday-Sunday weeks, week 1 = day 1 to first Sunday)
// for schedule_events and ministry_events.
// Usage: node scripts/fix-week-numbers-all.mjs [--apply]   (default is dry run)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')])
)

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const apply = process.argv.includes('--apply')

// Same rule as src/lib/week-utils.ts
function getWeekNumber(dateStr) {
  const date = new Date(dateStr + 'T12:00:00')
  const day = date.getDate()
  let firstSunday = 1
  while (new Date(date.getFullYear(), date.getMonth(), firstSunday).getDay() !== 0) firstSunday++
  if (day <= firstSunday) return 1
  return Math.ceil((day - firstSunday) / 7) + 1
}

for (const table of ['schedule_events', 'ministry_events']) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s.from(table).select('id, event_date, week_number').range(from, from + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) break
  }
  const wrong = rows.filter(r => r.event_date && getWeekNumber(r.event_date) !== r.week_number)
  console.log(`\n${table}: ${rows.length} rows, ${wrong.length} with wrong week`)
  const byMonth = {}
  for (const r of wrong) {
    const m = r.event_date.slice(0, 7)
    ;(byMonth[m] ||= []).push(`${r.event_date.slice(8)}: ${r.week_number}->${getWeekNumber(r.event_date)}`)
  }
  for (const [m, list] of Object.entries(byMonth)) console.log(`  ${m}: ${[...new Set(list)].join(', ')}`)

  if (apply) {
    for (const r of wrong) {
      const { error } = await s.from(table).update({ week_number: getWeekNumber(r.event_date) }).eq('id', r.id)
      if (error) console.error('  update failed', r.id, error.message)
    }
    console.log(`  ${wrong.length} rows updated`)
  }
}
if (!apply) console.log('\nDry run only. Re-run with --apply to write changes.')
