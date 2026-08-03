import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

// Member IDs from intercessao
const M = {
  neto: '2093969e-af37-4776-9ba2-d4119a4bf900',
  gabriel: 'c3190156-a15c-4ff1-a802-4aa793259d83',
  gisele: '9a1295f4-9ed9-4b03-9a5a-f7d3a174adc8',
  nicole: '82121355-75fe-406c-9b15-59c80d5513e7',
  marcao: '542cca80-2772-4672-acaa-ae5db7499921',
  grazi: '1b7b0873-0954-4015-acde-eb4a6baf7819',
  isaira: 'a0f1f4a4-178b-40b4-900b-472d47e5a581',
  alan: 'b748268c-8902-468b-abbf-a399a263514a',
  laura: '87c4382a-cbd4-4d16-9c9c-5025883ac39f',
  michele: 'dff46ee7-6eda-49ab-8922-f0cd349f868b',
  mario: '0b5bbe3e-4c86-4079-82d7-2e4c347b00d9',
  maria: 'd238d652-556c-4a2d-b4d8-6ba8e01c6a9d',
  duda: '137a700a-9e6b-425d-a97d-f39d3563dd08',
  estela: '0d92dab6-0f1b-4389-94a7-94b2c475ac9d',
  milena: 'ccc14e5e-2a42-4173-a706-c3fd56c60a35',
}

// People who "Oram pelo Ministro" (blue) per event date + celebration
const orarPeloMinistro = [
  { date: '2026-08-02', cel: 1, member_id: M.nicole },
  { date: '2026-08-02', cel: 2, member_id: M.isaira },
  { date: '2026-08-09', cel: 1, member_id: M.laura },
  { date: '2026-08-09', cel: 2, member_id: M.duda },
  { date: '2026-08-16', cel: 1, member_id: M.estela },
  { date: '2026-08-16', cel: 2, member_id: M.nicole },
  { date: '2026-08-21', cel: 1, member_id: M.nicole },
  { date: '2026-08-23', cel: 1, member_id: M.laura },
  { date: '2026-08-23', cel: 2, member_id: M.duda },
  { date: '2026-08-30', cel: 1, member_id: M.gisele },
  { date: '2026-08-30', cel: 2, member_id: M.isaira },
]

async function run() {
  const { data: ministry } = await c.from('ministries').select('id').eq('slug', 'intercessao').single()
  const { data: schedule } = await c.from('ministry_schedules').select('id').eq('ministry_id', ministry.id).eq('month', 8).eq('year', 2026).single()
  const { data: events } = await c.from('ministry_events').select('id, event_date').eq('schedule_id', schedule.id)

  for (const opm of orarPeloMinistro) {
    const event = events.find(e => e.event_date === opm.date)
    if (!event) { console.log('Event not found:', opm.date); continue }

    // Find the assignment for this member in this celebration
    const { data: assignments } = await c.from('ministry_assignments')
      .select('id, member_id, celebration_number, role_name')
      .eq('event_id', event.id)
      .eq('member_id', opm.member_id)
      .eq('celebration_number', opm.cel)

    if (assignments && assignments.length > 0) {
      await c.from('ministry_assignments')
        .update({ role_name: 'Orar pelo Ministro' })
        .eq('id', assignments[0].id)
      console.log(`✓ ${opm.date} C${opm.cel} -> ${opm.member_id.slice(0,8)} = Orar pelo Ministro`)
    } else {
      console.log(`✗ Not found: ${opm.date} C${opm.cel} member ${opm.member_id.slice(0,8)}`)
    }
  }

  console.log('\nDone!')
}

run().catch(console.error)
