// Script para cadastrar membros da Projeção e configurar a líder
// Execute com: node scripts/seed-projecao.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Parse .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=')
  if (idx > 0 && !line.startsWith('#')) {
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltam variáveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  console.log('🔧 Cadastrando membros da Projeção...\n')

  // 1. Buscar ministério "projecao"
  const { data: ministry, error: minErr } = await supabase
    .from('ministries')
    .select('id, name, slug')
    .eq('slug', 'projecao')
    .single()

  if (minErr || !ministry) {
    console.error('Ministério "projecao" não encontrado. Criando...')
    const { data: newMinistry, error: createErr } = await supabase
      .from('ministries')
      .insert({ name: 'Projeção', slug: 'projecao', leader_name: 'Tatiana Renata' })
      .select()
      .single()

    if (createErr) {
      console.error('Erro ao criar ministério:', createErr.message)
      process.exit(1)
    }
    console.log('✅ Ministério "Projeção" criado!')
    var ministryId = newMinistry.id
  } else {
    console.log(`✅ Ministério encontrado: ${ministry.name} (${ministry.id})`)
    var ministryId = ministry.id
  }

  // 2. Cadastrar membros
  const members = [
    { name: 'Anderson Heitor', email: 'anderson.heitor@hotmail.com' },
    { name: 'Marcio Adriano Montanhez', email: 'marcioadriano2008@gmail.com' },
    { name: 'Geraldo Henrique Medeiros da Silva', email: 'heenriquemedeiros@gmail.com' },
    { name: 'Daniel Cristian', email: 'danielcristiansmartins@outlook.com' },
  ]

  for (const member of members) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('ministry_members')
      .select('id')
      .eq('ministry_id', ministryId)
      .ilike('email', member.email)
      .single()

    if (existing) {
      console.log(`  ⏭️  ${member.name} já cadastrado`)
      continue
    }

    const { error } = await supabase
      .from('ministry_members')
      .insert({ ministry_id: ministryId, name: member.name, email: member.email })

    if (error) {
      console.error(`  ❌ Erro ao cadastrar ${member.name}: ${error.message}`)
    } else {
      console.log(`  ✅ ${member.name} cadastrado`)
    }
  }

  // 3. Configurar a líder (Tatiana Renata)
  const leaderEmail = 'taty_renata@hotmail.com'
  const leaderName = 'Tatiana Renata'

  // Update leader_name on ministry
  await supabase
    .from('ministries')
    .update({ leader_name: leaderName })
    .eq('id', ministryId)

  // Check/create profile for leader and link as leader_user_id
  // First, check if she has an auth account
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', leaderEmail)

  if (profiles && profiles.length > 0) {
    // Link leader_user_id
    await supabase
      .from('ministries')
      .update({ leader_user_id: profiles[0].id })
      .eq('id', ministryId)
    console.log(`\n✅ Líder vinculada: ${leaderName} (${profiles[0].id})`)
  } else {
    // Create auth user for the leader
    const INTERNAL_PASSWORD = 'worship-planner-internal-2024-secret'
    const { data: newUser, error: userErr } = await supabase.auth.admin.createUser({
      email: leaderEmail,
      password: INTERNAL_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: leaderName },
    })

    if (userErr) {
      if (userErr.message.includes('already been registered')) {
        // Find existing user
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const existingUser = users?.find(u => u.email?.toLowerCase() === leaderEmail.toLowerCase())
        if (existingUser) {
          await supabase.from('profiles').upsert({
            id: existingUser.id,
            email: leaderEmail,
            full_name: leaderName,
            role: 'member',
          }, { onConflict: 'id' })
          await supabase
            .from('ministries')
            .update({ leader_user_id: existingUser.id })
            .eq('id', ministryId)
          console.log(`\n✅ Líder vinculada (usuária existente): ${leaderName}`)
        }
      } else {
        console.error(`\n❌ Erro ao criar usuária líder: ${userErr.message}`)
      }
    } else if (newUser) {
      await supabase.from('profiles').upsert({
        id: newUser.user.id,
        email: leaderEmail,
        full_name: leaderName,
        role: 'member',
      }, { onConflict: 'id' })
      await supabase
        .from('ministries')
        .update({ leader_user_id: newUser.user.id })
        .eq('id', ministryId)
      console.log(`\n✅ Líder criada e vinculada: ${leaderName} (${newUser.user.id})`)
    }
  }

  console.log('\n🎉 Seed da Projeção concluído!')
}

main().catch(console.error)
