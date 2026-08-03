import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

// Member IDs
const M = {
  neto: '2093969e-af37-4776-9ba2-d4119a4bf900',
  gabriel: 'c3190156-a15c-4ff1-a802-4aa793259d83',
  gisele: '9a1295f4-9ed9-4b03-9a5a-f7d3a174adc8',
  nicole: '82121355-75fe-406c-9b15-59c80d5513e7',
  marcao: '542cca80-2772-4672-acaa-ae5db7499921',
  grazi: '20b70ed6-3e70-4eea-8f4e-61211de94fc6',
  isaira: 'a0f1f4a4-178b-40b4-900b-472d47e5a581',
  alan: 'b748268c-8902-468b-abbf-a399a263514a',
  laura: '87c4382a-cbd4-4d16-9c9c-5025883ac39f',
  michele: 'dff46ee7-6eda-49ab-8922-f0cd349f868b',
  mario: '0b5bbe3e-4c86-4079-82d7-2e4c347b00d9',
  maria: 'd238d652-556c-4a2d-b4d8-6ba8e01c6a9d',
  duda: '137a700a-9e6b-425d-a97d-f39d3563dd08',
  estela: '0d92dab6-0f1b-4389-94a7-94b2c475ac9d',
  milena: 'ccc14e5e-2a42-4173-a706-c3fd56c60a35',
  claudio: '175764a1-69f2-4c8e-aee8-ca643f6b4240',
  luis: '6450c0b6-2d9f-4bca-8ac5-dde722c8fa08',
  moises: '90c0454f-0194-4ab2-a96c-037854ad7105',
  anaLaura: '1f6447c6-bd0e-49c6-bb1b-b1e7388d84e1',
  fernanda: '4b4c7845-fd49-456e-af23-e4f918b68e94',
  celina: '48cd1392-4590-44d7-a734-946f8fd34de3',
  eliane: '4a671ba8-e7f6-4e76-a2ec-1fe443118ebd',
  debora: '2f0377df-86d9-485c-a82f-3a2a1a741eff',
}

async function run() {
  // Get ministry
  const { data: ministry } = await c.from('ministries').select('id').eq('slug', 'intercessao').single()
  if (!ministry) { console.log('Ministry not found'); return }

  // Create or get schedule for August 2026
  let { data: schedule } = await c.from('ministry_schedules')
    .select('id')
    .eq('ministry_id', ministry.id)
    .eq('month', 8)
    .eq('year', 2026)
    .single()

  if (!schedule) {
    const { data: newSchedule } = await c.from('ministry_schedules')
      .insert({ ministry_id: ministry.id, month: 8, year: 2026, is_published: false })
      .select().single()
    schedule = newSchedule
  }

  if (!schedule) { console.log('Could not create schedule'); return }

  // Delete existing events for this schedule
  const { data: existingEvents } = await c.from('ministry_events').select('id').eq('schedule_id', schedule.id)
  if (existingEvents && existingEvents.length > 0) {
    const eventIds = existingEvents.map(e => e.id)
    await c.from('ministry_assignments').delete().in('event_id', eventIds)
    await c.from('ministry_events').delete().eq('schedule_id', schedule.id)
    console.log('Cleared existing events')
  }

  // Define the schedule from PDF
  // Each event: { date, day_of_week, week, scale_name, num_celebrations, assignments: [{member_id, celebration, role_name}] }
  const events = [
    {
      date: '2026-08-01', day_of_week: 'Sábado', week: 1, scale_name: 'SALA DE CURA', num_celebrations: 1,
      assignments: [
        { member_id: M.gabriel, celebration: 1, role_name: 'Intercessor' },
      ]
    },
    {
      date: '2026-08-02', day_of_week: 'Domingo', week: 1, scale_name: 'CELEBRAÇÃO', num_celebrations: 2,
      assignments: [
        // C1 - Manhã
        { member_id: M.neto, celebration: 1, role_name: 'Torre' },
        { member_id: M.gabriel, celebration: 1, role_name: 'Coluna' },
        { member_id: M.gisele, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.nicole, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.moises, celebration: 1, role_name: 'Suporte' },
        { member_id: M.anaLaura, celebration: 1, role_name: 'Suporte' },
        // C2 - Noite
        { member_id: M.neto, celebration: 2, role_name: 'Torre' },
        { member_id: M.marcao, celebration: 2, role_name: 'Coluna' },
        { member_id: M.grazi, celebration: 2, role_name: 'Intercessor' },
        { member_id: M.isaira, celebration: 2, role_name: 'Intercessor' },
        { member_id: M.fernanda, celebration: 2, role_name: 'Suporte' },
        { member_id: M.moises, celebration: 2, role_name: 'Suporte' },
      ]
    },
    {
      date: '2026-08-07', day_of_week: 'Sexta-Feira', week: 1, scale_name: 'STRONGBROTHERS', num_celebrations: 1,
      assignments: [
        { member_id: M.marcao, celebration: 1, role_name: 'Torre' },
        { member_id: M.neto, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.gabriel, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.alan, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.luis, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.mario, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.claudio, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.moises, celebration: 1, role_name: 'Suporte' },
      ]
    },
    {
      date: '2026-08-09', day_of_week: 'Domingo', week: 2, scale_name: 'CELEBRAÇÃO', num_celebrations: 2,
      assignments: [
        // C1 - Manhã
        { member_id: M.luis, celebration: 1, role_name: 'Torre' },
        { member_id: M.alan, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.laura, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.michele, celebration: 1, role_name: 'Coluna' },
        { member_id: M.celina, celebration: 1, role_name: 'Suporte' },
        { member_id: M.debora, celebration: 1, role_name: 'Suporte' },
        // C2 - Noite
        { member_id: M.luis, celebration: 2, role_name: 'Torre' },
        { member_id: M.mario, celebration: 2, role_name: 'Coluna' },
        { member_id: M.maria, celebration: 2, role_name: 'Intercessor' },
        { member_id: M.duda, celebration: 2, role_name: 'Intercessor' },
        { member_id: M.debora, celebration: 2, role_name: 'Suporte' },
        { member_id: M.eliane, celebration: 2, role_name: 'Suporte' },
      ]
    },
    {
      date: '2026-08-16', day_of_week: 'Domingo', week: 3, scale_name: 'CELEBRAÇÃO', num_celebrations: 2,
      assignments: [
        // C1 - Manhã
        { member_id: M.neto, celebration: 1, role_name: 'Torre' },
        { member_id: M.gabriel, celebration: 1, role_name: 'Coluna' },
        { member_id: M.gisele, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.estela, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.anaLaura, celebration: 1, role_name: 'Suporte' },
        { member_id: M.fernanda, celebration: 1, role_name: 'Suporte' },
        // C2 - Noite
        { member_id: M.neto, celebration: 2, role_name: 'Torre' },
        { member_id: M.marcao, celebration: 2, role_name: 'Coluna' },
        { member_id: M.grazi, celebration: 2, role_name: 'Intercessor' },
        { member_id: M.nicole, celebration: 2, role_name: 'Intercessor' },
        { member_id: M.anaLaura, celebration: 2, role_name: 'Suporte' },
        { member_id: M.eliane, celebration: 2, role_name: 'Suporte' },
      ]
    },
    {
      date: '2026-08-21', day_of_week: 'Sexta-Feira', week: 3, scale_name: 'EMPODERADAS', num_celebrations: 1,
      assignments: [
        { member_id: M.grazi, celebration: 1, role_name: 'Torre' },
        { member_id: M.duda, celebration: 1, role_name: 'Coluna' },
        { member_id: M.laura, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.nicole, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.debora, celebration: 1, role_name: 'Suporte' },
        { member_id: M.anaLaura, celebration: 1, role_name: 'Suporte' },
      ]
    },
    {
      date: '2026-08-23', day_of_week: 'Domingo', week: 4, scale_name: 'CELEBRAÇÃO', num_celebrations: 2,
      assignments: [
        // C1 - Manhã
        { member_id: M.luis, celebration: 1, role_name: 'Torre' },
        { member_id: M.alan, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.milena, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.laura, celebration: 1, role_name: 'Coluna' },
        { member_id: M.celina, celebration: 1, role_name: 'Suporte' },
        { member_id: M.eliane, celebration: 1, role_name: 'Suporte' },
        // C2 - Noite
        { member_id: M.luis, celebration: 2, role_name: 'Torre' },
        { member_id: M.maria, celebration: 2, role_name: 'Intercessor' },
        { member_id: M.duda, celebration: 2, role_name: 'Intercessor' },
        { member_id: M.mario, celebration: 2, role_name: 'Coluna' },
        { member_id: M.celina, celebration: 2, role_name: 'Suporte' },
        { member_id: M.debora, celebration: 2, role_name: 'Suporte' },
      ]
    },
    {
      date: '2026-08-28', day_of_week: 'Sexta-Feira', week: 4, scale_name: 'VIGÍLIA', num_celebrations: 1,
      assignments: [
        { member_id: M.claudio, celebration: 1, role_name: 'Torre' },
        { member_id: M.neto, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.luis, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.alan, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.marcao, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.gabriel, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.mario, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.estela, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.gisele, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.nicole, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.laura, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.grazi, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.maria, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.michele, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.duda, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.milena, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.isaira, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.moises, celebration: 1, role_name: 'Suporte' },
        { member_id: M.anaLaura, celebration: 1, role_name: 'Suporte' },
        { member_id: M.fernanda, celebration: 1, role_name: 'Suporte' },
        { member_id: M.celina, celebration: 1, role_name: 'Suporte' },
        { member_id: M.eliane, celebration: 1, role_name: 'Suporte' },
        { member_id: M.debora, celebration: 1, role_name: 'Suporte' },
      ]
    },
    {
      date: '2026-08-30', day_of_week: 'Domingo', week: 5, scale_name: 'CELEBRAÇÃO', num_celebrations: 2,
      assignments: [
        // C1 - Manhã
        { member_id: M.neto, celebration: 1, role_name: 'Torre' },
        { member_id: M.gabriel, celebration: 1, role_name: 'Coluna' },
        { member_id: M.grazi, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.gisele, celebration: 1, role_name: 'Intercessor' },
        { member_id: M.moises, celebration: 1, role_name: 'Suporte' },
        { member_id: M.anaLaura, celebration: 1, role_name: 'Suporte' },
        // C2 - Noite
        { member_id: M.neto, celebration: 2, role_name: 'Torre' },
        { member_id: M.marcao, celebration: 2, role_name: 'Coluna' },
        { member_id: M.nicole, celebration: 2, role_name: 'Intercessor' },
        { member_id: M.isaira, celebration: 2, role_name: 'Intercessor' },
        { member_id: M.fernanda, celebration: 2, role_name: 'Suporte' },
        { member_id: M.moises, celebration: 2, role_name: 'Suporte' },
      ]
    },
  ]

  // Insert events
  for (const event of events) {
    const { data: newEvent, error: evError } = await c.from('ministry_events').insert({
      schedule_id: schedule.id,
      event_date: event.date,
      day_of_week: event.day_of_week,
      week_number: event.week,
      scale_name: event.scale_name,
      num_celebrations: event.num_celebrations,
    }).select().single()

    if (evError || !newEvent) {
      console.log('Error inserting event:', event.date, evError?.message)
      continue
    }

    // Insert assignments
    for (const a of event.assignments) {
      const { error: aErr } = await c.from('ministry_assignments').insert({
        event_id: newEvent.id,
        member_id: a.member_id,
        celebration_number: a.celebration,
        role: 'operator',
        role_name: a.role_name,
      })
      if (aErr) console.log('Error assignment:', a.member_id, aErr.message)
    }

    console.log(`✓ ${event.date} ${event.scale_name} (${event.assignments.length} assignments)`)
  }

  console.log('\nDone! Escala de agosto da Intercessão inserida.')
}

run().catch(console.error)
