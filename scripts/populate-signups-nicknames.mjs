import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

function generateNickname(fullName) {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 2) return fullName
  return `${parts[0]} ${parts[parts.length - 1]}`
}

async function run() {
  // 1. Populate ministry_signups nicknames
  const { data: signups } = await c.from('ministry_signups').select('id, name, nickname')
  let count1 = 0
  for (const s of signups || []) {
    if (s.nickname) continue
    const nickname = generateNickname(s.name)
    await c.from('ministry_signups').update({ nickname }).eq('id', s.id)
    count1++
  }
  console.log(`ministry_signups: ${count1} nicknames updated`)

  // 2. Sync nicknames to ministry_members (by email)
  // Get all signups with nickname
  const { data: allSignups } = await c.from('ministry_signups').select('email, nickname').not('nickname', 'is', null)
  
  let count2 = 0
  for (const s of allSignups || []) {
    if (!s.email || !s.nickname) continue
    const { data: updated } = await c.from('ministry_members')
      .update({ nickname: s.nickname })
      .ilike('email', s.email)
      .select('id')
    if (updated && updated.length > 0) count2 += updated.length
  }
  console.log(`ministry_members: ${count2} nicknames synced from signups`)

  // 3. Also sync to members table (louvor)
  let count3 = 0
  for (const s of allSignups || []) {
    if (!s.email || !s.nickname) continue
    const { data: updated } = await c.from('members')
      .update({ name: s.name }) // members don't have nickname field but we keep names in sync
      .ilike('email', s.email)
      .select('id')
  }

  console.log('Done!')
}

run().catch(console.error)
