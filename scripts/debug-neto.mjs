import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function run() {
  const email = 'anizioalvesdiasneto@gmail.com'
  
  console.log('=== Buscando Neto em todas as tabelas ===\n')

  // ministry_signups
  const { data: signup } = await c.from('ministry_signups').select('*').ilike('email', email)
  console.log('ministry_signups:', signup?.length || 0, 'registros')
  if (signup?.length) console.log('  →', JSON.stringify(signup[0], null, 2))

  // ministry_members
  const { data: mm } = await c.from('ministry_members').select('id, name, email, nickname, ministry_id').ilike('email', email)
  console.log('\nministry_members:', mm?.length || 0, 'registros')
  mm?.forEach(m => console.log(`  → ${m.name} | nickname: "${m.nickname}" | ministry: ${m.ministry_id}`))

  // members (louvor)
  const { data: members } = await c.from('members').select('id, name, email, nickname').ilike('email', email)
  console.log('\nmembers (louvor):', members?.length || 0, 'registros')
  members?.forEach(m => console.log(`  → ${m.name} | nickname: "${m.nickname}"`))

  // profiles
  const { data: profiles } = await c.from('profiles').select('id, full_name, email').ilike('email', email)
  console.log('\nprofiles:', profiles?.length || 0, 'registros')
  profiles?.forEach(p => console.log(`  → ${p.full_name} | ${p.email}`))
}

run().catch(console.error)
