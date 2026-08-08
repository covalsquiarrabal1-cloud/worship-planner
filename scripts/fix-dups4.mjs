import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  const mid = '6e643b3a-8c8a-4aec-95f0-ca8c43f5c6d9'
  
  // First, check if ministry_momentos references these members
  const { data: momentos } = await c.from('ministry_momentos').select('id, member_id').eq('ministry_id', mid)
  console.log('Momentos entries:', momentos?.length)
  
  const usedMemberIds = new Set(momentos?.map(m => m.member_id).filter(Boolean))
  console.log('Used member IDs:', usedMemberIds.size)

  // Get all members
  const { data: members } = await c.from('momentos_members').select('id, name, nickname').eq('ministry_id', mid).order('name')
  console.log('All members:', members?.length)

  // Find duplicates
  const keep = new Map() // nickname -> first id
  const dupes = []
  for (const m of members || []) {
    const key = (m.nickname || m.name).toLowerCase().trim()
    if (keep.has(key)) {
      dupes.push(m)
    } else {
      keep.set(key, m.id)
    }
  }
  console.log('Duplicates to remove:', dupes.length)

  for (const dupe of dupes) {
    const key = (dupe.nickname || dupe.name).toLowerCase().trim()
    const keepId = keep.get(key)
    
    // Update any momentos referencing the duplicate to point to the kept one
    if (usedMemberIds.has(dupe.id)) {
      console.log(`  Updating refs for ${dupe.nickname || dupe.name}: ${dupe.id} -> ${keepId}`)
      await c.from('ministry_momentos').update({ member_id: keepId }).eq('member_id', dupe.id)
    }

    // Now delete the duplicate
    const { error } = await c.from('momentos_members').delete().eq('id', dupe.id)
    if (error) {
      console.log(`  ERROR deleting ${dupe.id}: ${error.message}`)
    } else {
      console.log(`  Deleted: ${dupe.nickname || dupe.name} (${dupe.id})`)
    }
  }

  // Final count
  const { data: final } = await c.from('momentos_members').select('id, nickname, name').eq('ministry_id', mid).order('name')
  console.log(`\nFinal: ${final?.length} members`)
  final?.forEach(m => console.log(`  - ${m.nickname || m.name}`))
}
run()
