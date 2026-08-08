// Execute SQL migration via Supabase HTTP API
const SUPABASE_URL = 'https://cwfeqngelvknvocvtcna.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
const DB_PASSWORD = 'xR$7kP#2mN@9qL' // default Supabase project password

const SQL = `
CREATE TABLE IF NOT EXISTS intercessao_member_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES ministry_members(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN (
    'torre_domingo', 'torre_sexta', 'torre_strong', 'torre_empoderadas',
    'intercessor', 'coluna', 'suporte'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, role_type)
);

CREATE TABLE IF NOT EXISTS intercessao_event_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scale_name TEXT NOT NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('torre', 'intercessor', 'coluna', 'suporte')),
  num_people INTEGER NOT NULL DEFAULT 1,
  gender_filter TEXT NOT NULL DEFAULT 'any' CHECK (gender_filter IN ('male', 'female', 'any')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scale_name, role_type)
);

ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));
`

async function run() {
  // Try the SQL endpoint
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'HEAD',
    headers: { 'apikey': SERVICE_KEY },
  })
  console.log('Supabase reachable:', res.ok)

  // Use the Supabase Management API to run SQL
  // Project ref: cwfeqngelvknvocvtcna
  const mgmtRes = await fetch('https://api.supabase.com/v1/projects/cwfeqngelvknvocvtcna/database/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: SQL }),
  })

  if (mgmtRes.ok) {
    console.log('✓ SQL executed successfully!')
  } else {
    const text = await mgmtRes.text()
    console.log('Management API status:', mgmtRes.status)
    console.log('Response:', text.slice(0, 500))

    // Alternative: try /pg endpoint
    console.log('\nTrying /pg endpoint...')
    const pgRes = await fetch(`${SUPABASE_URL}/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: SQL }),
    })
    console.log('/pg status:', pgRes.status)
    if (pgRes.ok) {
      console.log('✓ SQL executed via /pg!')
    } else {
      console.log('/pg response:', (await pgRes.text()).slice(0, 300))
    }
  }
}

run().catch(console.error)
