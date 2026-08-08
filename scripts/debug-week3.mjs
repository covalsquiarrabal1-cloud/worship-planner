import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function debug() {
  // Get ALL events for August with their schedule info
  console.log('=== ALL EVENTS AUGUST 2026 (raw, no filter) ===')
  const { data: allEvents } = await supabase
    .from('schedule_events')
    .select('id, event_date, day_of_week, week_number, schedule_id, scale_type:scale_types(id, name)')
    .gte('event_date', '2026-08-01')
    .lte('event_date', '2026-08-31')
    .order('event_date')

  // Group by schedule_id
  const bySchedule = {}
  for (const e of allEvents) {
    if (!bySchedule[e.schedule_id]) bySchedule[e.schedule_id] = []
    bySchedule[e.schedule_id].push(e)
  }

  console.log(`Total events: ${allEvents.length}`)
  console.log(`Total schedules: ${Object.keys(bySchedule).length}`)
  console.log('')

  // Get schedule info
  const scheduleIds = Object.keys(bySchedule)
  const { data: schedules } = await supabase
    .from('schedules')
    .select('*')
    .in('id', scheduleIds)

  for (const schedule of schedules) {
    console.log(`\n=== Schedule ${schedule.id} | month=${schedule.month} year=${schedule.year} | published=${schedule.is_published} | created=${schedule.created_at} ===`)
    const events = bySchedule[schedule.id] || []
    for (const e of events) {
      console.log(`  ${e.event_date} ${e.day_of_week} week=${e.week_number} ${e.scale_type?.name}`)
    }
  }

  // Focus on week 3 events
  console.log('\n\n=== WEEK 3 EVENTS (all schedules) ===')
  const week3 = allEvents.filter(e => e.week_number === 3)
  for (const e of week3) {
    console.log(`${e.event_date} ${e.day_of_week} ${e.scale_type?.name} | schedule=${e.schedule_id}`)
  }

  // Check if ALIVE 15/08 specifically exists and is in a published schedule
  console.log('\n=== ALIVE 15/08 CHECK ===')
  const alive15 = allEvents.filter(e => e.event_date === '2026-08-15')
  for (const e of alive15) {
    const sched = schedules.find(s => s.id === e.schedule_id)
    console.log(`Event: ${e.scale_type?.name} | Schedule: ${e.schedule_id} | Published: ${sched?.is_published}`)
  }
}

debug().catch(console.error)
