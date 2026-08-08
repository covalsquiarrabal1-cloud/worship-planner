import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function run() {
  const { data: ministry } = await c.from('ministries').select('id').eq('slug', 'intercessao').single()
  const { data: members } = await c.from('ministry_members')
    .select('id, name, gender, email')
    .eq('ministry_id', ministry.id)
    .eq('is_blocked', false)
    .order('name')

  const noGender = members.filter(m => !m.gender)
  console.log(`Total membros: ${members.length}`)
  console.log(`Sem gender: ${noGender.length}`)
  if (noGender.length > 0) {
    console.log('\nMembros sem gender:')
    noGender.forEach(m => console.log(`  - ${m.name} (${m.email || 'sem email'})`))

    // Try to match from main members table
    const { data: mainMembers } = await c.from('members').select('email, gender')
    const emailMap = {}
    for (const m of mainMembers || []) {
      if (m.email) emailMap[m.email.toLowerCase()] = m.gender
    }

    console.log('\nAtualizando...')
    for (const mm of noGender) {
      if (mm.email) {
        const gender = emailMap[mm.email.toLowerCase()]
        if (gender) {
          await c.from('ministry_members').update({ gender }).eq('id', mm.id)
          console.log(`  ✓ ${mm.name} -> ${gender}`)
        } else {
          console.log(`  ⚠️ ${mm.name} - email não encontrado no principal`)
        }
      }
    }
  }

  // Show final state
  const { data: final } = await c.from('ministry_members')
    .select('name, gender')
    .eq('ministry_id', ministry.id)
    .eq('is_blocked', false)
    .order('name')
  
  console.log('\nEstado final:')
  console.table(final?.map(m => ({ nome: m.name, genero: m.gender || '❌ FALTANDO' })))
}

run().catch(console.error)
