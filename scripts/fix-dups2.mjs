import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  // Get ALL momentos_members (might be across multiple ministry_ids)
  const { data } = await c.from('momentos_members').select('id, name, nickname, ministry_id').order('name')
  
  // Group by ministry and deduplicate within each
  const byMinistry = {}
  for (const m of data || []) {
    if (!byMinistry[m.ministry_id]) byMinistry[m.ministry_id] = []
    byMinistry[m.ministry_id].push(m)
  }

  for (const [mid, members] of Object.entries(byMinistry)) {
    console.log(`Ministry ${mid}: ${members.length} members`)
    const seen = new Set()
    for (const m of members) {
      const key = (m.nickname || m.name).toLowerCase().replace(/\s+/g, ' ').trim()
      if (seen.has(key)) {
        console.log(`  DEL: ${m.nickname || m.name} (${m.id})`)
        await c.from('momentos_members').delete().eq('id', m.id)
      } else {
        seen.add(key)
        console.log(`  OK:  ${m.nickname || m.name}`)
      }
    }
  }

  // Final count
  const { data: final } = await c.from('momentos_members').select('id').eq('ministry_id', '6e643b3a-8c8a-4aec-95f0-ca8c43f5c6d9')
  console.log(`\nFinal count: ${final?.length}`)
}
run()
