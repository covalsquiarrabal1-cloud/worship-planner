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
  // Check current leader of Som
  const { data: som } = await supabase.from('ministries').select('*').eq('slug', 'som').single()
  console.log('Ministério Som:', som?.name, '| leader_name:', som?.leader_name, '| leader_user_id:', som?.leader_user_id)

  // Find Pedro's profile
  const { data: profile } = await supabase.from('profiles').select('id, email, full_name').ilike('email', 'salessep@hotmail.com').single()
  console.log('Profile Pedro:', profile)

  if (!profile) {
    // Create auth + profile
    const INTERNAL_PASSWORD = 'adoração26'
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: 'salessep@hotmail.com',
      password: INTERNAL_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Pedro Augusto Salesse', password_set: false },
    })

    if (error && error.message.includes('already been registered')) {
      const { data: { users } } = await supabase.auth.admin.listUsers()
      const existing = users?.find(u => u.email?.toLowerCase() === 'salessep@hotmail.com')
      if (existing) {
        await supabase.from('profiles').upsert({ id: existing.id, email: 'salessep@hotmail.com', full_name: 'Pedro Augusto Salesse', role: 'member' }, { onConflict: 'id' })
        await supabase.from('ministries').update({ leader_user_id: existing.id, leader_name: 'Pedro Augusto Salesse' }).eq('slug', 'som')
        console.log('✅ Pedro vinculado como líder do Som (user existente)')
      }
    } else if (newUser) {
      await supabase.from('profiles').upsert({ id: newUser.user.id, email: 'salessep@hotmail.com', full_name: 'Pedro Augusto Salesse', role: 'member' }, { onConflict: 'id' })
      await supabase.from('ministries').update({ leader_user_id: newUser.user.id, leader_name: 'Pedro Augusto Salesse' }).eq('slug', 'som')
      console.log('✅ Pedro criado e vinculado como líder do Som')
    }
  } else {
    // Profile exists, just set as leader
    await supabase.from('ministries').update({ leader_user_id: profile.id, leader_name: 'Pedro Augusto Salesse' }).eq('slug', 'som')
    console.log('✅ Pedro vinculado como líder do Som')
  }
}

main().catch(console.error)
