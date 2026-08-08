import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  const mid = '6e643b3a-8c8a-4aec-95f0-ca8c43f5c6d9'
  const { data } = await c.from('momentos_members').select('id, name, nickname').eq('ministry_id', mid).order('created_at')
  
  console.log('All members:', data?.length)
  data?.forEach(m => console.log(`  ${m.id.slice(0,8)} | name: "${m.name}" | nick: "${m.nickname}"`))

  // Deduplicate aggressively by nickname OR name (normalize)  
  const seen = new Set()
  const toDelete = []
  for (const m of data || []) {
    const key = (m.nickname || m.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
    if (seen.has(key)) {
      toDelete.push(m.id)
    } else {
      seen.add(key)
    }
  }

  console.log(`\nDeleting ${toDelete.length} duplicates...`)
  for (const id of toDelete) {
    await c.from('momentos_members').delete().eq('id', id)
  }

  const { data: final } = await c.from('momentos_members').select('id, nickname, name').eq('ministry_id', mid).order('name')
  console.log(`\nFinal: ${final?.length} unique members`)
  final?.forEach(m => console.log(`  ${m.nickname || m.name}`))
}
run()
