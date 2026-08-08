import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function debug() {
  // Simulate the exact query the API makes
  const { data, error } = await supabase
    .from('schedule_events')
    .select(`
      id,
      event_date,
      day_of_week,
      week_number,
      schedule_id,
      scale_type:scale_types(id, name, type),
      assignments:schedule_assignments(
        id,
        role,
        member:members(id, name, email, nickname)
      ),
      songs(id, order_num, title, version, minister, youtube_url)
    `)
    .gte('event_date', '2026-08-01')
    .lte('event_date', '2026-08-31')
    .order('event_date')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Total events returned: ${data.length}`)
  console.log('')

  for (const event of data) {
    console.log(`${event.event_date} | ${event.scale_type?.name} | week ${event.week_number} | ${event.assignments?.length || 0} assignments | ${event.songs?.length || 0} songs`)
  }

  // Check specifically week 3 events
  console.log('\n=== WEEK 2 & 3 DETAIL ===')
  const week23 = data.filter(e => e.week_number === 2 || e.week_number === 3)
  for (const event of week23) {
    console.log(`\n--- ${event.event_date} ${event.scale_type?.name} (week ${event.week_number}) ---`)
    console.log('Assignments:', event.assignments?.map(a => `${a.role}: ${a.member?.name}`))
    console.log('Songs:', event.songs?.map(s => `${s.order_num}. ${s.title}`))
  }

  // Now check - is there a RLS policy that could be blocking songs for non-admin?
  console.log('\n=== CHECK RLS ON SONGS TABLE ===')
  // Check with anon key
  const anonClient = createClient(
    'https://cwfeqngelvknvocvtcna.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzEyMTAsImV4cCI6MjEwMDEwNzIxMH0.XHdIZ5bpKwi4XCck9fUR5jZRsJvR-J7A-Y4vUavLfH4'
  )
  
  const { data: anonSongs, error: anonError } = await anonClient
    .from('songs')
    .select('*')
    .limit(5)
  
  console.log('Anon songs access:', anonError ? `ERROR: ${anonError.message}` : `OK (${anonSongs?.length} rows)`)
  
  // Check schedule_assignments with anon
  const { data: anonAssign, error: assignError } = await anonClient
    .from('schedule_assignments')
    .select('*')
    .limit(5)
  
  console.log('Anon assignments access:', assignError ? `ERROR: ${assignError.message}` : `OK (${anonAssign?.length} rows)`)
}

debug().catch(console.error)
