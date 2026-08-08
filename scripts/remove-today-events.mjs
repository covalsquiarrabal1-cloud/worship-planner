import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  const today = '2026-08-08' // Today's date (Saturday Aug 8 2026)

  // Find events created today in the louvor schedule (August 2026)
  const { data: events } = await c.from('schedule_events')
    .select('id, event_date, created_at, schedule_id')
    .gte('event_date', '2026-08-01')
    .lte('event_date', '2026-08-31')
    .gte('created_at', today + 'T00:00:00')
    .order('created_at', { ascending: false })

  console.log(`Events created today: ${events?.length}`)
  events?.forEach(e => console.log(`  ${e.event_date} | created: ${e.created_at?.slice(0, 19)}`))

  if (events && events.length > 0) {
    // Delete assignments first
    for (const ev of events) {
      await c.from('schedule_assignments').delete().eq('event_id', ev.id)
    }
    // Delete events
    const ids = events.map(e => e.id)
    await c.from('schedule_events').delete().in('id', ids)
    console.log(`\n✓ Removidos ${events.length} eventos criados hoje`)
  }

  // Also check if a duplicate schedule was created today
  const { data: schedules } = await c.from('schedules')
    .select('id, month, year, created_at')
    .eq('month', 8)
    .eq('year', 2026)
    .order('created_at')

  console.log(`\nSchedules for Aug 2026: ${schedules?.length}`)
  schedules?.forEach(s => console.log(`  ${s.id.slice(0,8)} | created: ${s.created_at?.slice(0, 19)}`))

  // If more than 1 schedule, remove the ones created today
  if (schedules && schedules.length > 1) {
    for (let i = 1; i < schedules.length; i++) {
      if (schedules[i].created_at?.startsWith(today)) {
        await c.from('schedules').delete().eq('id', schedules[i].id)
        console.log(`  ✓ Removed duplicate schedule ${schedules[i].id.slice(0,8)}`)
      }
    }
  }

  // Final count
  const { data: final } = await c.from('schedule_events')
    .select('id')
    .gte('event_date', '2026-08-01')
    .lte('event_date', '2026-08-31')
  console.log(`\nFinal: ${final?.length} eventos em agosto`)
}

run().catch(console.error)
