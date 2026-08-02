import { createClient } from '@supabase/supabase-js'

const client = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function run() {
  // 1. Create person_roles table
  const { error: e1 } = await client.from('person_roles').select('id').limit(1)
  if (e1 && e1.message.includes('does not exist')) {
    console.log('Table person_roles does not exist, need to create via SQL editor')
    console.log('Please run the SQL in scripts/create-person-roles.sql in Supabase Dashboard')
    process.exit(1)
  }

  // Check if table exists by trying to query it
  const { data: existing, error: checkErr } = await client.from('person_roles').select('*')
  
  if (checkErr) {
    console.log('Error checking person_roles:', checkErr.message)
    console.log('Table likely does not exist. Please run this SQL in Supabase SQL Editor:')
    console.log('')
    console.log(`CREATE TABLE IF NOT EXISTS person_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_person_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_email TEXT NOT NULL,
  role_id UUID REFERENCES person_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_email, role_id)
);`)
    process.exit(1)
  }

  console.log('person_roles table exists, current roles:', existing?.length || 0)

  // Insert default roles
  const defaultRoles = ['Membro', 'Pastor', 'Ministro']
  for (const name of defaultRoles) {
    const { error } = await client.from('person_roles').upsert({ name }, { onConflict: 'name' })
    if (error) console.log(`Error inserting role "${name}":`, error.message)
    else console.log(`Role "${name}" OK`)
  }

  // Get Membro role id
  const { data: membroRole } = await client.from('person_roles').select('id').eq('name', 'Membro').single()
  if (!membroRole) { console.log('Could not find Membro role'); return }

  // Get all unique emails from members and ministry_members
  const { data: members } = await client.from('members').select('email').not('email', 'is', null)
  const { data: ministryMembers } = await client.from('ministry_members').select('email').not('email', 'is', null)

  const emails = new Set()
  for (const m of members || []) if (m.email) emails.add(m.email.toLowerCase())
  for (const m of ministryMembers || []) if (m.email) emails.add(m.email.toLowerCase())

  console.log(`Found ${emails.size} unique emails, assigning Membro role...`)

  let count = 0
  for (const email of emails) {
    const { error } = await client.from('member_person_roles').upsert(
      { member_email: email, role_id: membroRole.id },
      { onConflict: 'member_email,role_id' }
    )
    if (!error) count++
  }

  console.log(`Done! Assigned Membro role to ${count} people.`)
}

run().catch(console.error)
