import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  // Get August 2026 schedule (louvor)
  const { data: schedules } = await c.from('schedules')
    .select('id')
    .eq('month', 8)
    .eq('year', 2026)

  console.log('Schedules for Aug 2026:', schedules?.length)

  if (!schedules || schedules.length <= 1) {
    console.log('No duplicate schedules found')
    
    // Check if duplicates are in events within same schedule
    const scheduleId = schedules?.[0]?.id
    if (!scheduleId) return

    const { data: events } = await c.from('schedule_events')
      .select('id, event_date, scale_type_id, week_number')
      .eq('schedule_id', scheduleId)
      .order('event_date')
      .order('week_number')

    console.log(`Total events: ${events?.length}`)

    // Find duplicates (same date + same scale_type_id)
    const seen = new Map()
    const toDelete = []

    for (const ev of events || []) {
      const key = `${ev.event_date}_${ev.scale_type_id}`
      if (seen.has(key)) {
        toDelete.push(ev.id)
        console.log(`  DUP: ${ev.event_date} scale:${ev.scale_type_id} week:${ev.week_number}`)
      } else {
        seen.set(key, ev.id)
      }
    }

    console.log(`\nDuplicates to remove: ${toDelete.length}`)

    if (toDelete.length > 0) {
      // Delete assignments first
      for (const id of toDelete) {
        await c.from('schedule_assignments').delete().eq('event_id', id)
      }
      // Delete events
      await c.from('schedule_events').delete().in('id', toDelete)
      console.log('✓ Duplicates removed!')
    }
  } else {
    // Multiple schedules for same month - remove the newer one
    console.log('Multiple schedules found, keeping the first one')
    const keepId = schedules[0].id
    for (let i = 1; i < schedules.length; i++) {
      const dupId = schedules[i].id
      // Get events
      const { data: events } = await c.from('schedule_events').select('id').eq('schedule_id', dupId)
      if (events?.length) {
        for (const ev of events) {
          await c.from('schedule_assignments').delete().eq('event_id', ev.id)
        }
        await c.from('schedule_events').delete().eq('schedule_id', dupId)
      }
      await c.from('schedules').delete().eq('id', dupId)
      console.log(`✓ Removed duplicate schedule ${dupId}`)
    }
  }

  // Verify final state
  const { data: finalEvents } = await c.from('schedule_events')
    .select('id, event_date')
    .gte('event_date', '2026-08-01')
    .lte('event_date', '2026-08-31')
    .order('event_date')

  console.log(`\nFinal: ${finalEvents?.length} events in August`)
}

run().catch(console.error)
