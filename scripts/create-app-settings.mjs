import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=')
  if (idx > 0 && !line.startsWith('#')) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  // Create table via SQL
  const { error } = await supabase.from('_temp_check').select('*').limit(0)
  
  // Use raw SQL via rest
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({})
  })

  // Alternative: use the SQL endpoint directly
  const sqlRes = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    }
  })
  
  console.log('Tabela app_settings precisa ser criada manualmente no Supabase Dashboard.')
  console.log('')
  console.log('Execute este SQL no SQL Editor do Supabase:')
  console.log('')
  console.log(`CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text,
  created_at timestamptz DEFAULT now()
);

INSERT INTO public.app_settings (key, value) VALUES ('hide_other_members', 'false') ON CONFLICT (key) DO NOTHING;`)
}

main().catch(console.error)
