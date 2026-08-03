import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

function generateNickname(fullName) {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 2) return fullName
  // First name + last name
  return `${parts[0]} ${parts[parts.length - 1]}`
}

async function run() {
  const { data: members } = await c.from('ministry_members').select('id, name, nickname')
  
  let updated = 0
  for (const m of members || []) {
    if (m.nickname) continue // Already has nickname
    const nickname = generateNickname(m.name)
    if (nickname !== m.name) {
      await c.from('ministry_members').update({ nickname }).eq('id', m.id)
      updated++
    }
  }

  console.log(`Updated ${updated} nicknames out of ${members?.length} members`)
}

run().catch(console.error)
