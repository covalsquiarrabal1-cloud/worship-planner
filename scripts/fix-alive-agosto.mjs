import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  const aliveId = '6e643b3a-8c8a-4aec-95f0-ca8c43f5c6d9'

  // Get members
  const { data: members } = await c.from('ministry_members')
    .select('id, name, nickname')
    .eq('ministry_id', aliveId)
    .eq('is_blocked', false)

  const M = {}
  for (const m of members) M[m.nickname || m.name] = m.id
  console.log('Members:', Object.keys(M).join(', '))

  // Get schedule
  const { data: schedule } = await c.from('ministry_schedules')
    .select('id').eq('ministry_id', aliveId).eq('month', 8).eq('year', 2026).single()
  if (!schedule) { console.log('No schedule'); return }

  // Delete existing events and assignments
  const { data: oldEvents } = await c.from('ministry_events').select('id').eq('schedule_id', schedule.id)
  if (oldEvents?.length) {
    await c.from('ministry_assignments').delete().in('event_id', oldEvents.map(e => e.id))
    await c.from('ministry_events').delete().eq('schedule_id', schedule.id)
  }
  console.log('Cleared old events')

  // Insert correct events from PDF
  const events = [
    {
      date: '2026-08-01', day: 'Sábado', scale: 'ALIVE',
      assignments: [
        { name: 'Nicole Nunes', role: 'Intercessor' },
        { name: 'Bruna Brito', role: 'Intercessor' },
        { name: 'Luciano Brito', role: 'Intercessor' },
        { name: 'Mario Silva', role: 'Intercessor' },
        { name: 'Bruna Brito', role: 'Coluna' },
        { name: 'Mario Silva', role: 'Orar pelo Ministro' },
        { name: 'Nicole Nunes', role: 'Orar pelo Ministro' },
        { name: 'Luciano Brito', role: 'Torre' },
        { name: 'Ana Almeida', role: 'Suporte' },
        { name: 'Camili Silva', role: 'Suporte' },
      ]
    },
    {
      date: '2026-08-15', day: 'Sábado', scale: 'ALIVE',
      assignments: [
        { name: 'Graziela Nunes', role: 'Intercessor' },
        { name: 'Michele Santos', role: 'Intercessor' },
        { name: 'Marcão', role: 'Intercessor' },
        { name: 'Luis Amaral', role: 'Intercessor' },
        { name: 'Michele Santos', role: 'Coluna' },
        { name: 'Luis Amaral', role: 'Orar pelo Ministro' },
        { name: 'Marcão', role: 'Orar pelo Ministro' },
        { name: 'Graziela Nunes', role: 'Torre' },
        { name: 'Caroline Antunes', role: 'Suporte' },
        { name: 'Maria Santaterra', role: 'Suporte' },
      ]
    },
    {
      date: '2026-08-22', day: 'Sábado', scale: 'ALIVE',
      assignments: [
        { name: 'Livia Gois', role: 'Intercessor' },
        { name: 'Adriele Silva', role: 'Intercessor' },
        { name: 'Luciano Brito', role: 'Intercessor' },
        { name: 'Mario Silva', role: 'Intercessor' },
        { name: 'Adriele Silva', role: 'Coluna' },
        { name: 'Luciano Brito', role: 'Orar pelo Ministro' },
        { name: 'Livia Gois', role: 'Orar pelo Ministro' },
        { name: 'Graziela Nunes', role: 'Torre' },
        { name: 'Ana Almeida', role: 'Suporte' },
        { name: 'Camili Silva', role: 'Suporte' },
      ]
    },
    {
      date: '2026-08-29', day: 'Sábado', scale: 'ALIVE',
      assignments: [
        { name: 'Francieli Morais', role: 'Intercessor' },
        { name: 'Maria Santaterra', role: 'Intercessor' },
        { name: 'Marcão', role: 'Intercessor' },
        { name: 'Luis Amaral', role: 'Intercessor' },
        { name: 'Francieli Morais', role: 'Coluna' },
        { name: 'Maria Santaterra', role: 'Orar pelo Ministro' },
        { name: 'Marcão', role: 'Orar pelo Ministro' },
        { name: 'Luis Amaral', role: 'Torre' },
        { name: 'Caroline Antunes', role: 'Suporte' },
        { name: 'Maria Santaterra', role: 'Suporte' },
      ]
    },
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

    if (!event) { console.log(`Error creating ${ev.date}`); continue }

    for (const a of ev.assignments) {
      const memberId = M[a.name]
      if (!memberId) {
        // Try partial match
        const key = Object.keys(M).find(k => k.toLowerCase().includes(a.name.toLowerCase().slice(0, 6)))
        if (key) {
          await c.from('ministry_assignments').insert({
            event_id: event.id, member_id: M[key], celebration_number: 1,
            role: 'operator', role_name: a.role,
          })
        } else {
          console.log(`  ⚠️ ${a.name} not found`)
        }
      } else {
        await c.from('ministry_assignments').insert({
          event_id: event.id, member_id: memberId, celebration_number: 1,
          role: 'operator', role_name: a.role,
        })
      }
    }
    console.log(`✓ ${ev.date} ${ev.scale}`)
  }

  console.log('\n✅ Escala Alive agosto corrigida!')
}

run().catch(console.error)
