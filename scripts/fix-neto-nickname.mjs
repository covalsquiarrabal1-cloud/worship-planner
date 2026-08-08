import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function run() {
  // Test: update ministry_signups directly
  const { data, error } = await c
    .from('ministry_signups')
    .update({ nickname: 'Neto' })
    .ilike('email', 'anizioalvesdiasneto@gmail.com')
    .select()

  console.log('Update result:', data, error)

  // Verify
  const { data: check } = await c.from('ministry_signups').select('nickname').ilike('email', 'anizioalvesdiasneto@gmail.com')
  console.log('After update:', check)
}

run().catch(console.error)
