import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function run() {
  const { data: ministry } = await c.from('ministries').select('id').eq('slug', 'intercessao-alive').single()
  if (!ministry) { console.log('Ministry not found'); return }

  // Get all members from intercessao-alive
  const { data: aliveMembers } = await c.from('ministry_members').select('id, name').eq('ministry_id', ministry.id)
  
  // Helper to find member by partial name
  function findMember(name) {
    return aliveMembers?.find(m => m.name.toLowerCase().includes(name.toLowerCase()))
  }

  // People not in intercessao-alive that we need to add
  const toAdd = ['Bianca', 'Cintia', 'Isaira Candido', 'Gisele Ribeiro', 'Sonia Meira', 'Laura Meira', 'Claudio Anselmo Gomes']
  
  for (const name of toAdd) {
    const existing = findMember(name.split(' ')[0])
    if (!existing) {
      const { data, error } = await c.from('ministry_members').insert({
        ministry_id: ministry.id,
        name: name,
        nickname: name,
        role: 'membro',
        email: '',
      }).select().single()
      if (data) console.log(`Added: ${name} -> ${data.id}`)
      else console.log(`Error adding ${name}: ${error?.message}`)
    } else {
      console.log(`Already exists: ${name} -> ${existing.name}`)
    }
  }

  // Reload members
  const { data: allMembers } = await c.from('ministry_members').select('id, name').eq('ministry_id', ministry.id)
  
  function find(name) {
    return allMembers?.find(m => m.name.toLowerCase().includes(name.toLowerCase()))?.id
  }

  // Delete existing momentos for Aug 2026
  await c.from('ministry_momentos').delete().eq('ministry_id', ministry.id).eq('month', 8).eq('year', 2026)

  // Escala Momentos - August 2026
  const momentos = [
    // 02/08 Domingo
    { date: '2026-08-02', culto: 'Celebração Domingo (Dois Horários)', momento: 'Sobrenatural', name: 'Bianca' },
    { date: '2026-08-02', culto: 'Celebração Domingo (Dois Horários)', momento: 'Dízimos e Ofertas', name: 'Cintia' },
    // 09/08 Domingo
    { date: '2026-08-09', culto: 'Celebração Domingo', momento: 'Sobrenatural', name: 'Isaira' },
    { date: '2026-08-09', culto: 'Celebração Domingo', momento: 'Dízimos e Ofertas', name: 'Luis' },
    // 16/08 Domingo
    { date: '2026-08-16', culto: 'Celebração Domingo (Dois Horários)', momento: 'Sobrenatural', name: 'Gisele' },
    { date: '2026-08-16', culto: 'Celebração Domingo (Dois Horários)', momento: 'Dízimos e Ofertas', name: 'Sonia' },
    // 23/08 Domingo
    { date: '2026-08-23', culto: 'Celebração Domingo (Dois Horários)', momento: 'Sobrenatural', name: 'Laura Meira' },
    { date: '2026-08-23', culto: 'Celebração Domingo (Dois Horários)', momento: 'Dízimos e Ofertas', name: 'Claudio' },
    // 30/08 Domingo
    { date: '2026-08-30', culto: 'Celebração Domingo (Dois Horários)', momento: 'Sobrenatural', name: 'Graziela' },
    { date: '2026-08-30', culto: 'Celebração Domingo (Dois Horários)', momento: 'Dízimos e Ofertas', name: 'Neto' },
  ]

  let count = 0
  for (const m of momentos) {
    const memberId = find(m.name)
    const { error } = await c.from('ministry_momentos').insert({
      ministry_id: ministry.id,
      event_date: m.date,
      culto: m.culto,
      momento: m.momento,
      member_id: memberId || null,
      month: 8,
      year: 2026,
    })
    if (error) console.log(`Error: ${m.date} ${m.momento}: ${error.message}`)
    else { count++; console.log(`✓ ${m.date} ${m.momento} -> ${m.name}`) }
  }

  console.log(`\nDone! ${count} momentos inserted.`)
}

run().catch(console.error)
