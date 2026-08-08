import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  // === INTERCESSÃO ALIVE - AGOSTO ===
  console.log('=== INTERCESSÃO ALIVE - AGOSTO ===\n')
  
  const { data: alive } = await c.from('ministries').select('id').eq('slug', 'intercessao-alive').single()
  const { data: aliveSchedule } = await c.from('ministry_schedules')
    .select('id').eq('ministry_id', alive.id).eq('month', 8).eq('year', 2026).single()

  if (aliveSchedule) {
    const { data: events } = await c.from('ministry_events')
      .select(`id, event_date, scale_name, num_celebrations,
        assignments:ministry_assignments(id, celebration_number, role_name, member:ministry_members(name, nickname))`)
      .eq('schedule_id', aliveSchedule.id)
      .order('event_date')

    for (const ev of events || []) {
      console.log(`${ev.event_date} | ${ev.scale_name || '-'}`)
      const sorted = (ev.assignments || []).sort((a, b) => {
        const order = { Torre: 0, Intercessor: 1, Coluna: 2, 'Orar pelo Ministro': 3, Suporte: 4 }
        return (order[a.role_name] || 9) - (order[b.role_name] || 9)
      })
      for (const a of sorted) {
        console.log(`  ${(a.role_name || '?').padEnd(20)} ${a.member?.nickname || a.member?.name || '?'}`)
      }
      console.log('')
    }
  } else {
    console.log('Nenhuma escala encontrada para Alive agosto')
  }

  // === INTERCESSÃO - AGOSTO ===
  console.log('\n=== INTERCESSÃO - AGOSTO ===\n')
  
  const { data: inter } = await c.from('ministries').select('id').eq('slug', 'intercessao').single()
  const { data: intSchedule } = await c.from('ministry_schedules')
    .select('id').eq('ministry_id', inter.id).eq('month', 8).eq('year', 2026).single()

  if (intSchedule) {
    const { data: events } = await c.from('ministry_events')
      .select(`id, event_date, scale_name, num_celebrations,
        assignments:ministry_assignments(id, celebration_number, role_name, member:ministry_members(name, nickname))`)
      .eq('schedule_id', intSchedule.id)
      .order('event_date')

    for (const ev of events || []) {
      const cels = [...new Set((ev.assignments || []).map(a => a.celebration_number))].sort()
      for (const cel of cels) {
        const celAssignments = (ev.assignments || []).filter(a => a.celebration_number === cel)
        console.log(`${ev.event_date} | C${cel} | ${ev.scale_name || '-'}`)
        const sorted = celAssignments.sort((a, b) => {
          const order = { Torre: 0, Coluna: 1, Intercessor: 2, Suporte: 3 }
          return (order[a.role_name] || 9) - (order[b.role_name] || 9)
        })
        for (const a of sorted) {
          console.log(`  ${(a.role_name || '?').padEnd(14)} ${a.member?.nickname || a.member?.name || '?'}`)
        }
      }
      console.log('')
    }
  } else {
    console.log('Nenhuma escala encontrada para Intercessão agosto')
  }
}

run().catch(console.error)
