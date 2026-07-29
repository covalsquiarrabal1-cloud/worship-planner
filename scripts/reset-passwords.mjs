// Reset all users to use internal password and require password creation on next login
// Run: node scripts/reset-passwords.mjs

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
const INTERNAL_PASSWORD = 'worship-planner-internal-2024-secret'

async function main() {
  console.log('Resetando senhas de todos os usuários...\n')

  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) { console.error('Erro:', error.message); return }

  for (const user of users || []) {
    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
      password: INTERNAL_PASSWORD,
      user_metadata: { ...user.user_metadata, password_set: false },
    })

    if (updateErr) {
      console.log(`  ❌ ${user.email} — ${updateErr.message}`)
    } else {
      console.log(`  ✅ ${user.email} — resetado`)
    }
  }

  console.log(`\n🎉 ${(users || []).length} usuários resetados.`)
  console.log('Senha temporária para primeiro acesso:', INTERNAL_PASSWORD)
}

main().catch(console.error)
