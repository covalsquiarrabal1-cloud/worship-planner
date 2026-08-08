import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  const ministryId = 'b45f4729-210a-4f66-aa25-98cbd7ee8ceb' // Profético

  // Add Carol to ministry_members
  const { data: carol } = await c.from('ministry_members').insert({
    ministry_id: ministryId,
    name: 'Caroline Osorio',
    email: 'carolineosorio@gmail.com',
    nickname: 'Carol',
    is_blocked: false,
  }).select().single()
  console.log('✓ Carol adicionada ao Profético:', carol?.id)

  // Add to ministry_signups (cadastro geral) if not exists
  const { data: existing } = await c.from('ministry_signups')
    .select('id').ilike('email', 'carolineosorio@gmail.com')
  
  if (!existing || existing.length === 0) {
    await c.from('ministry_signups').insert({
      name: 'Caroline Osorio',
      email: 'carolineosorio@gmail.com',
      nickname: 'Carol',
    })
    console.log('✓ Carol cadastrada no cadastro geral')
  }

  // Assign to 30/08 event
  const { data: schedule } = await c.from('ministry_schedules')
    .select('id').eq('ministry_id', ministryId).eq('month', 8).eq('year', 2026).single()

  if (schedule) {
    const { data: ev30 } = await c.from('ministry_events')
      .select('id').eq('schedule_id', schedule.id).eq('event_date', '2026-08-30').single()

    if (ev30 && carol) {
      await c.from('ministry_assignments').insert({
        event_id: ev30.id,
        member_id: carol.id,
        celebration_number: 1,
        role: 'operator',
        role_name: 'Profético',
      })
      console.log('✓ Carol escalada no 30/08')
    }
  }

  console.log('\n✅ Concluído!')
}

run().catch(console.error)
