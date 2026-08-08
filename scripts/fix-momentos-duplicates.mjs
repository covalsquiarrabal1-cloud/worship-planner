import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function run() {
  const { data: ministry } = await c.from('ministries').select('id').eq('slug', 'intercessao-alive').single()
  if (!ministry) { console.log('Ministry not found'); return }

  const { data: members } = await c.from('momentos_members')
    .select('*')
    .eq('ministry_id', ministry.id)
    .order('name')

  console.log(`Total membros momentos: ${members?.length}`)
  
  // Find duplicates by name
  const seen = new Map()
  const toDelete = []
  
  for (const m of members || []) {
    const key = m.name.toLowerCase()
    if (seen.has(key)) {
      toDelete.push(m.id)
      console.log(`  Duplicado: ${m.name} (${m.id})`)
    } else {
      seen.set(key, m.id)
    }
  }

  if (toDelete.length > 0) {
    console.log(`\nRemovendo ${toDelete.length} duplicados...`)
    for (const id of toDelete) {
      await c.from('momentos_members').delete().eq('id', id)
    }
    console.log('✓ Duplicados removidos')
  } else {
    console.log('Nenhum duplicado encontrado')
  }

  // Show final list
  const { data: final } = await c.from('momentos_members')
    .select('id, name, nickname')
    .eq('ministry_id', ministry.id)
    .order('name')
  console.log(`\nMembros únicos: ${final?.length}`)
  final?.forEach(m => console.log(`  - ${m.nickname || m.name}`))
}

run().catch(console.error)
