import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  const ministryId = 'b45f4729-210a-4f66-aa25-98cbd7ee8ceb'

  // Check members
  const { data: members } = await c.from('ministry_members')
    .select('id, name, nickname')
    .eq('ministry_id', ministryId)
    .eq('is_blocked', false)
    .order('name')

  console.log(`Membros do Profético: ${members?.length}`)
  members?.forEach(m => console.log(`  - ${m.nickname || m.name} (${m.id.slice(0,8)})`))

  // Members from the PDF
  const names = ['Cintia', 'Fernanda', 'Mateus', 'Nicole', 'Claudio', 'Michele', 'Luis', 'Viviane', 'Duda', 'Carol']
  
  // Match names to members
  const matched = {}
  for (const name of names) {
    const found = members?.find(m => 
      (m.nickname || m.name).toLowerCase().includes(name.toLowerCase()) ||
      m.name.toLowerCase().includes(name.toLowerCase())
    )
    if (found) {
      matched[name] = found.id
      console.log(`  ✓ ${name} -> ${found.nickname || found.name}`)
    } else {
      console.log(`  ⚠️ ${name} NOT FOUND`)
    }
  }

  // Create schedule for August 2026
  let { data: schedule } = await c.from('ministry_schedules')
    .select('id')
    .eq('ministry_id', ministryId)
    .eq('month', 8)
    .eq('year', 2026)
    .single()

  if (!schedule) {
    const { data: newSchedule } = await c.from('ministry_schedules')
      .insert({ ministry_id: ministryId, month: 8, year: 2026, is_published: true })
      .select().single()
    schedule = newSchedule
  }
  if (!schedule) { console.log('Could not create schedule'); return }
  console.log(`\nSchedule: ${schedule.id}`)

  // Clear existing events
  const { data: existing } = await c.from('ministry_events').select('id').eq('schedule_id', schedule.id)
  if (existing?.length) {
    await c.from('ministry_assignments').delete().in('event_id', existing.map(e => e.id))
    await c.from('ministry_events').delete().eq('schedule_id', schedule.id)
    console.log('Cleared existing events')
  }

  // Insert events from PDF
  const events = [
    { date: '2026-08-02', day: 'Domingo', scale: 'Manhã', members: ['Cintia', 'Fernanda'] },
    { date: '2026-08-09', day: 'Domingo', scale: 'Noite', members: ['Mateus', 'Nicole'] },
    { date: '2026-08-16', day: 'Domingo', scale: 'Manhã', members: ['Claudio', 'Michele'] },
    { date: '2026-08-23', day: 'Domingo', scale: 'Noite', members: ['Luis', 'Viviane'] },
    { date: '2026-08-30', day: 'Domingo', scale: 'Manhã', members: ['Duda', 'Carol'] },
  ]

  for (const ev of events) {
    const { data: event } = await c.from('ministry_events').insert({
      schedule_id: schedule.id,
      event_date: ev.date,
      day_of_week: ev.day,
      week_number: Math.ceil(parseInt(ev.date.slice(8)) / 7),
      scale_name: ev.scale,
      num_celebrations: 1,
    }).select().single()

    if (!event) { console.log(`Error creating event ${ev.date}`); continue }

    for (const name of ev.members) {
      const memberId = matched[name]
      if (memberId) {
        await c.from('ministry_assignments').insert({
          event_id: event.id,
          member_id: memberId,
          celebration_number: 1,
          role: 'operator',
          role_name: 'Profético',
        })
      }
    }
    console.log(`✓ ${ev.date} ${ev.scale}: ${ev.members.join(', ')}`)
  }

  console.log('\n✅ Escala do Profético agosto inserida!')
}

run().catch(console.error)
