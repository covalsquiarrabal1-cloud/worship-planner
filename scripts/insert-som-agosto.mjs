import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

const M = {
  pedro: 'd686c227-207c-41db-ad1d-3e9b88d3a114',
  michele: '1cc621d5-6d85-4187-8930-ff6ec24dc42f',
  lucas: 'c08d5b62-73d6-415a-863e-0453481d181e',
  bruno: '14eef47b-292f-4826-80a5-ae76eafdc836',
  mateus: 'cd572b06-5f00-402a-9881-14d72fd20bf0',
}

async function run() {
  const { data: ministry } = await c.from('ministries').select('id').eq('slug', 'som').single()
  if (!ministry) { console.log('Ministry not found'); return }

  let { data: schedule } = await c.from('ministry_schedules')
    .select('id').eq('ministry_id', ministry.id).eq('month', 8).eq('year', 2026).single()

  if (!schedule) {
    const { data: ns } = await c.from('ministry_schedules')
      .insert({ ministry_id: ministry.id, month: 8, year: 2026, is_published: false })
      .select().single()
    schedule = ns
  }
  if (!schedule) { console.log('Could not create schedule'); return }

  // Clear existing
  const { data: existing } = await c.from('ministry_events').select('id').eq('schedule_id', schedule.id)
  if (existing && existing.length > 0) {
    await c.from('ministry_assignments').delete().in('event_id', existing.map(e => e.id))
    await c.from('ministry_events').delete().eq('schedule_id', schedule.id)
    console.log('Cleared existing')
  }

  const events = [
    // Semana 1
    { date: '2026-08-01', day: 'Sábado', week: 1, scale: 'ALIVE', cel: 1, assignments: [{ m: M.pedro, role: 'Operador' }] },
    { date: '2026-08-02', day: 'Domingo', week: 1, scale: 'CELEBRAÇÃO', cel: 2, assignments: [
      { m: M.pedro, role: 'Operador', c: 1 },
      { m: M.michele, role: 'Operador', c: 2 },
    ]},
    // Semana 2
    { date: '2026-08-07', day: 'Sexta-Feira', week: 2, scale: 'STRONGBROTHERS', cel: 1, assignments: [{ m: M.lucas, role: 'Operador' }] },
    { date: '2026-08-08', day: 'Sábado', week: 2, scale: 'FESTA CAIPIRA', cel: 1, assignments: [{ m: M.pedro, role: 'Operador' }] },
    { date: '2026-08-09', day: 'Domingo', week: 2, scale: 'CELEBRAÇÃO', cel: 2, assignments: [
      { m: M.pedro, role: 'Operador', c: 1 }, // "Montar Som" - still Pedro assigned
      { m: M.pedro, role: 'Operador', c: 2 },
    ]},
    // Semana 3 - Conferência Céus Abertos
    { date: '2026-08-16', day: 'Domingo', week: 3, scale: 'CELEBRAÇÃO', cel: 2, assignments: [
      { m: M.pedro, role: 'Operador', c: 1 },
      { m: M.bruno, role: 'Operador', c: 2 },
    ]},
    // Semana 4
    { date: '2026-08-21', day: 'Sexta-Feira', week: 4, scale: 'EMPODERADAS', cel: 1, assignments: [{ m: M.michele, role: 'Operador' }] },
    { date: '2026-08-22', day: 'Sábado', week: 4, scale: 'ALIVE', cel: 1, assignments: [{ m: M.lucas, role: 'Operador' }] },
    { date: '2026-08-23', day: 'Domingo', week: 4, scale: 'CELEBRAÇÃO', cel: 2, assignments: [
      { m: M.lucas, role: 'Operador', c: 1 },
      { m: M.mateus, role: 'Operador', c: 2 },
    ]},
    // Semana 5
    { date: '2026-08-28', day: 'Sexta-Feira', week: 5, scale: 'VIGÍLIA', cel: 1, assignments: [{ m: M.pedro, role: 'Operador' }] },
    { date: '2026-08-29', day: 'Sábado', week: 5, scale: 'ALIVE', cel: 1, assignments: [{ m: M.pedro, role: 'Operador' }] },
    { date: '2026-08-30', day: 'Domingo', week: 5, scale: 'CELEBRAÇÃO', cel: 2, assignments: [
      { m: M.bruno, role: 'Operador', c: 1 },
      { m: M.lucas, role: 'Operador', c: 2 },
    ]},
  ]

  for (const event of events) {
    const { data: newEvent, error } = await c.from('ministry_events').insert({
      schedule_id: schedule.id,
      event_date: event.date,
      day_of_week: event.day,
      week_number: event.week,
      scale_name: event.scale,
      num_celebrations: event.cel,
    }).select().single()

    if (error || !newEvent) { console.log('Error:', event.date, error?.message); continue }

    for (const a of event.assignments) {
      await c.from('ministry_assignments').insert({
        event_id: newEvent.id,
        member_id: a.m,
        celebration_number: a.c || 1,
        role: 'operator',
        role_name: a.role,
      })
    }
    console.log(`✓ ${event.date} ${event.scale} (${event.assignments.length})`)
  }

  console.log('\nDone!')
}

run().catch(console.error)
