import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function debug() {
  // 1. Check all schedules for August 2026
  console.log('=== SCHEDULES AGOSTO 2026 ===')
  const { data: schedules } = await supabase
    .from('schedules')
    .select('*')
    .eq('month', 8)
    .eq('year', 2026)
    .order('created_at')

  console.table(schedules)

  // 2. Check events for week 2-3 (08/08 to 16/08)
  console.log('\n=== EVENTS 08/08 - 16/08 ===')
  const { data: events } = await supabase
    .from('schedule_events')
    .select(`
      id,
      event_date,
      day_of_week,
      week_number,
      schedule_id,
      scale_type:scale_types(id, name)
    `)
    .gte('event_date', '2026-08-08')
    .lte('event_date', '2026-08-16')
    .order('event_date')

  console.table(events?.map(e => ({
    id: e.id.slice(0, 8),
    date: e.event_date,
    day: e.day_of_week,
    week: e.week_number,
    schedule: e.schedule_id?.slice(0, 8),
    type: e.scale_type?.name
  })))

  // 3. Check songs for those events
  if (events && events.length > 0) {
    console.log('\n=== SONGS PER EVENT ===')
    for (const event of events) {
      const { data: songs } = await supabase
        .from('songs')
        .select('id, title, minister, order_num')
        .eq('event_id', event.id)
        .order('order_num')
      
      console.log(`${event.event_date} ${event.scale_type?.name} (schedule: ${event.schedule_id?.slice(0,8)}) => ${songs?.length || 0} songs`)
      if (songs && songs.length > 0) {
        songs.forEach(s => console.log(`  ${s.order_num}. ${s.title} - ${s.minister}`))
      }
    }
  }

  // 4. Check assignments for 15/08 specifically
  console.log('\n=== ASSIGNMENTS 15/08 ===')
  const event15 = events?.filter(e => e.event_date === '2026-08-15')
  if (event15 && event15.length > 0) {
    for (const ev of event15) {
      const { data: assignments } = await supabase
        .from('schedule_assignments')
        .select('role, member:members(name)')
        .eq('event_id', ev.id)
      console.log(`Event ${ev.id.slice(0,8)} (schedule ${ev.schedule_id?.slice(0,8)}):`)
      console.table(assignments?.map(a => ({ role: a.role, member: a.member?.name })))
    }
  }
}

debug().catch(console.error)
