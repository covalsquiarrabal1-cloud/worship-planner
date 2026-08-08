import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function run() {
  const { data: ministry } = await c.from('ministries').select('id').eq('slug', 'intercessao-alive').single()

  const people = [
    'Bianca',
    'Cíntia',
    'Isaira Candido',
    'Gisele Ribeiro',
    'Sonia Meira',
    'Laura Meira',
    'Claudio Anselmo Gomes',
    'Graziela Nunes',
    'Anizio Alves Dias Neto',
    'Luis Henrique Elias do Amaral',
  ]

  const inserted = {}

  for (const name of people) {
    const nickname = name.split(/\s+/).length > 2
      ? `${name.split(/\s+/)[0]} ${name.split(/\s+/).pop()}`
      : name

    const { data, error } = await c.from('momentos_members').insert({
      ministry_id: ministry.id,
      name,
      nickname,
    }).select().single()

    if (error) console.log(`ERR ${name}: ${error.message}`)
    else { console.log(`✓ ${nickname} -> ${data.id}`); inserted[nickname] = data.id }
  }

  // Now assign members to the momentos
  const assignments = [
    { date: '2026-08-02', momento: 'Sobrenatural', nick: 'Bianca' },
    { date: '2026-08-02', momento: 'Dízimos e Ofertas', nick: 'Cíntia' },
    { date: '2026-08-09', momento: 'Sobrenatural', nick: 'Isaira Candido' },
    { date: '2026-08-09', momento: 'Dízimos e Ofertas', nick: 'Luis Amaral' },
    { date: '2026-08-16', momento: 'Sobrenatural', nick: 'Gisele Ribeiro' },
    { date: '2026-08-16', momento: 'Dízimos e Ofertas', nick: 'Sonia Meira' },
    { date: '2026-08-23', momento: 'Sobrenatural', nick: 'Laura Meira' },
    { date: '2026-08-23', momento: 'Dízimos e Ofertas', nick: 'Claudio Gomes' },
    { date: '2026-08-30', momento: 'Sobrenatural', nick: 'Graziela Nunes' },
    { date: '2026-08-30', momento: 'Dízimos e Ofertas', nick: 'Anizio Neto' },
  ]

  // Get all momentos_members
  const { data: allMembers } = await c.from('momentos_members').select('id, name, nickname').eq('ministry_id', ministry.id)

  for (const a of assignments) {
    const member = allMembers?.find(m =>
      m.nickname?.toLowerCase().includes(a.nick.split(' ')[0].toLowerCase()) ||
      m.name.toLowerCase().includes(a.nick.split(' ')[0].toLowerCase())
    )
    if (!member) { console.log(`NOT FOUND: ${a.nick}`); continue }

    // Find the momento record
    const { data: momento } = await c.from('ministry_momentos')
      .select('id')
      .eq('event_date', a.date)
      .eq('momento', a.momento)
      .eq('ministry_id', ministry.id)
      .single()

    if (!momento) { console.log(`Momento not found: ${a.date} ${a.momento}`); continue }

    await c.from('ministry_momentos').update({ member_id: member.id }).eq('id', momento.id)
    console.log(`  Assigned: ${a.date} ${a.momento} -> ${member.nickname || member.name}`)
  }

  console.log('\nDone!')
}

run().catch(console.error)
