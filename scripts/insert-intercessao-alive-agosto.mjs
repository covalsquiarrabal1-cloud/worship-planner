import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

const M = {
  nicole: 'a76fe3e6-9621-4365-9992-f4e0d9b1d192',
  bruna: '1c9bbf5a-7313-4b65-9c3e-49fd3d32da97',
  luciano: '65281989-8a8b-45bb-a8c4-f28b3897c1dd',
  mario: 'e92e73c1-f259-4397-8644-af04f83a9749',
  graziela: 'ebdc6ac1-45c1-4310-b52c-0af336a5bd8a',
  michele: '55c472ea-5a82-432b-94e7-5b4e565bdf3a',
  marcao: 'ca57518b-f1d6-4dc5-86e9-85754780fdae',
  luis: '7f2b2d46-3d56-404f-957d-cc458026ca67',
  rebeca: '5e44c208-6404-4b3d-b859-1eaa6dd764c4',
  adriele: 'b1d55832-15e8-4117-b4c9-d2e2bc7e7e65',
  mariaLuiza: '71f2f557-243c-488e-b5e2-82090fa1066c',
  franciele: '16996140-5ec4-45dc-8515-28dcf91bce8e',
  anaLaura: 'a8b25fc3-4dec-4e4e-ac18-d74527a4d2ae',
  camili: '8ac5b07b-eef4-4285-8f83-190981d7ecb0',
  carol: '6b81a47c-811c-4b85-bbd6-710aa61404ec',
  sofia: 'aa4b3279-d5d5-4b9e-a087-9453844fce28',
}

async function run() {
  const { data: ministry } = await c.from('ministries').select('id').eq('slug', 'intercessao-alive').single()
  if (!ministry) { console.log('Ministry not found'); return }

  // Create or get schedule
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

  // Escala from PDF
  const events = [
    {
      date: '2026-08-01', day_of_week: 'Sexta-Feira', week: 1, scale_name: 'ALIVE', num_celebrations: 1,
      assignments: [
        { member_id: M.nicole, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.bruna, celebration: 1, role_name: 'Coluna' },
        { member_id: M.luciano, celebration: 1, role_name: 'Torre' },
        { member_id: M.mario, celebration: 1, role_name: 'Orar pelo Ministro' },
        { member_id: M.nicole, celebration: 1, role_name: 'Orar pelo Ministro' },
        { member_id: M.anaLaura, celebration: 1, role_name: 'Suporte' },
        { member_id: M.camili, celebration: 1, role_name: 'Suporte' },
      ]
    },
    {
      date: '2026-08-15', day_of_week: 'Sexta-Feira', week: 3, scale_name: 'ALIVE', num_celebrations: 1,
      assignments: [
        { member_id: M.graziela, celebration: 1, role_name: 'Torre' },
        { member_id: M.michele, celebration: 1, role_name: 'Coluna' },
        { member_id: M.marcao, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.luis, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.luis, celebration: 1, role_name: 'Orar pelo Ministro' },
        { member_id: M.marcao, celebration: 1, role_name: 'Orar pelo Ministro' },
        { member_id: M.carol, celebration: 1, role_name: 'Suporte' },
        { member_id: M.sofia, celebration: 1, role_name: 'Suporte' },
      ]
    },
    {
      date: '2026-08-22', day_of_week: 'Sexta-Feira', week: 4, scale_name: 'ALIVE', num_celebrations: 1,
      assignments: [
        { member_id: M.graziela, celebration: 1, role_name: 'Torre' },
        { member_id: M.adriele, celebration: 1, role_name: 'Coluna' },
        { member_id: M.rebeca, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.luciano, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.mario, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.luciano, celebration: 1, role_name: 'Orar pelo Ministro' },
        { member_id: M.rebeca, celebration: 1, role_name: 'Orar pelo Ministro' },
        { member_id: M.anaLaura, celebration: 1, role_name: 'Suporte' },
        { member_id: M.camili, celebration: 1, role_name: 'Suporte' },
      ]
    },
    {
      date: '2026-08-29', day_of_week: 'Sexta-Feira', week: 5, scale_name: 'ALIVE', num_celebrations: 1,
      assignments: [
        { member_id: M.luis, celebration: 1, role_name: 'Torre' },
        { member_id: M.franciele, celebration: 1, role_name: 'Coluna' },
        { member_id: M.mariaLuiza, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.marcao, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.mariaLuiza, celebration: 1, role_name: 'Orar pelo Ministro' },
        { member_id: M.marcao, celebration: 1, role_name: 'Orar pelo Ministro' },
        { member_id: M.carol, celebration: 1, role_name: 'Suporte' },
        { member_id: M.sofia, celebration: 1, role_name: 'Suporte' },
      ]
    },
  ]

  for (const event of events) {
    const { data: newEvent, error: evError } = await c.from('ministry_events').insert({
      schedule_id: schedule.id,
      event_date: event.date,
      day_of_week: event.day_of_week,
      week_number: event.week,
      scale_name: event.scale_name,
      num_celebrations: event.num_celebrations,
    }).select().single()

    if (evError || !newEvent) { console.log('Error:', event.date, evError?.message); continue }

    for (const a of event.assignments) {
      await c.from('ministry_assignments').insert({
        event_id: newEvent.id,
        member_id: a.member_id,
        celebration_number: a.celebration,
        role: 'operator',
        role_name: a.role_name,
      })
    }
    console.log(`✓ ${event.date} ${event.scale_name} (${event.assignments.length} assignments)`)
  }

  console.log('\nDone!')
}

run().catch(console.error)
