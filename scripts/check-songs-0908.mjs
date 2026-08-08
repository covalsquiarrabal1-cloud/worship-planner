import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  // Check events for 09/08
  const { data: events } = await c.from('schedule_events')
    .select('id, event_date, schedule_id, scale_type_id')
    .eq('event_date', '2026-08-09')
  
  console.log('Events for 2026-08-09:', events?.length)
  events?.forEach(e => console.log(`  ${e.id} | schedule: ${e.schedule_id}`))

  // Check songs linked to these events
  for (const ev of events || []) {
    const { data: songs } = await c.from('songs')
      .select('id, title, minister, event_id')
      .eq('event_id', ev.id)
    console.log(`  Songs for ${ev.id}: ${songs?.length}`)
    songs?.forEach(s => console.log(`    - ${s.title} (${s.minister})`))
  }

  // Check if there are orphaned songs for 08/09 date
  const { data: allSongs } = await c.from('songs')
    .select('id, title, minister, event_id')
  
  // Find songs whose event_id doesn't exist in schedule_events
  const { data: allEvents } = await c.from('schedule_events').select('id')
  const eventIds = new Set(allEvents?.map(e => e.id))
  
  const orphaned = allSongs?.filter(s => s.event_id && !eventIds.has(s.event_id))
  if (orphaned?.length) {
    console.log(`\nOrphaned songs: ${orphaned.length}`)
    orphaned.forEach(s => console.log(`  ${s.title} (${s.minister}) -> event: ${s.event_id}`))
  }
}

run().catch(console.error)
