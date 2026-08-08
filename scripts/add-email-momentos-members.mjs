import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  // Get all momentos_members
  const { data: members } = await c.from('momentos_members').select('id, name, nickname, email')
  console.log(`Momentos members: ${members?.length}`)

  // Get ministry_signups for email matching
  const { data: signups } = await c.from('ministry_signups').select('name, email, nickname')
  
  // Get ministry_members for email matching
  const { data: mmembers } = await c.from('ministry_members').select('name, email, nickname')

  // Build name -> email map
  const emailMap = new Map()
  for (const s of signups || []) {
    if (s.email) {
      emailMap.set(s.name?.toLowerCase(), s.email.toLowerCase())
      if (s.nickname) emailMap.set(s.nickname.toLowerCase(), s.email.toLowerCase())
    }
  }
  for (const m of mmembers || []) {
    if (m.email) {
      emailMap.set(m.name?.toLowerCase(), m.email.toLowerCase())
      if (m.nickname) emailMap.set(m.nickname.toLowerCase(), m.email.toLowerCase())
    }
  }

  let updated = 0
  for (const m of members || []) {
    if (m.email) continue // already has email
    
    // Try to find email by name or nickname
    const searchKeys = [m.name?.toLowerCase(), m.nickname?.toLowerCase()].filter(Boolean)
    let foundEmail = null
    for (const key of searchKeys) {
      if (emailMap.has(key)) {
        foundEmail = emailMap.get(key)
        break
      }
    }

    // Try partial match
    if (!foundEmail) {
      const searchName = (m.nickname || m.name || '').toLowerCase()
      for (const [name, email] of emailMap.entries()) {
        if (name.includes(searchName) || searchName.includes(name)) {
          foundEmail = email
          break
        }
      }
    }

    if (foundEmail) {
      await c.from('momentos_members').update({ email: foundEmail }).eq('id', m.id)
      console.log(`  ✓ ${m.nickname || m.name} -> ${foundEmail}`)
      updated++
    } else {
      console.log(`  ⚠️ ${m.nickname || m.name} - email não encontrado`)
    }
  }

  console.log(`\n✅ ${updated} emails atualizados`)
}

run().catch(console.error)
