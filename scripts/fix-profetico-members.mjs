import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  const ministryId = 'b45f4729-210a-4f66-aa25-98cbd7ee8ceb'

  // Add Luis Henrique
  const { data: luis } = await c.from('ministry_members').insert({
    ministry_id: ministryId,
    name: 'Luis Henrique Elias do Amaral',
    email: 'rick_amaral95@yahoo.com.br',
    nickname: 'Luis Amaral',
    is_blocked: false,
  }).select().single()
  console.log('✓ Luis adicionado:', luis?.id)

  // Add Maria Eduarda (Duda)
  const { data: duda } = await c.from('ministry_members').insert({
    ministry_id: ministryId,
    name: 'Maria Eduarda da Silva Azeredo',
    email: 'mariaeduardazrd@gmail.com',
    nickname: 'Duda',
    is_blocked: false,
  }).select().single()
  console.log('✓ Duda adicionada:', duda?.id)

  // Now update the assignments for the events that were missing
  const { data: schedule } = await c.from('ministry_schedules')
    .select('id')
    .eq('ministry_id', ministryId)
    .eq('month', 8)
    .eq('year', 2026)
    .single()

  if (!schedule) { console.log('Schedule not found'); return }

  // Get events
  const { data: events } = await c.from('ministry_events')
    .select('id, event_date, scale_name')
    .eq('schedule_id', schedule.id)
    .order('event_date')

  // 23/08 Noite - Luis + Viviane (Luis was missing)
  const ev23 = events?.find(e => e.event_date === '2026-08-23')
  if (ev23 && luis) {
    await c.from('ministry_assignments').insert({
      event_id: ev23.id,
      member_id: luis.id,
      celebration_number: 1,
      role: 'operator',
      role_name: 'Profético',
    })
    console.log('✓ Luis atribuído ao 23/08')
  }

  // 30/08 Manhã - Duda + Carol (Duda was missing)
  const ev30 = events?.find(e => e.event_date === '2026-08-30')
  if (ev30 && duda) {
    await c.from('ministry_assignments').insert({
      event_id: ev30.id,
      member_id: duda.id,
      celebration_number: 1,
      role: 'operator',
      role_name: 'Profético',
    })
    console.log('✓ Duda atribuída ao 30/08')
  }

  console.log('\n✅ Membros adicionados e escala atualizada!')
}

run().catch(console.error)
