import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function main() {
  // Buscar todos os membros com role lider ou ambos
  const { data: leaders } = await supabase
    .from('ministry_members')
    .select('id, name, email, role, ministry_id')
    .in('role', ['lider', 'ambos'])
    .order('name')

  // Buscar ministérios
  const { data: ministries } = await supabase
    .from('ministries')
    .select('id, name, slug, leader_name')

  // Buscar as seleções do formulário para comparar
  const { data: selections } = await supabase
    .from('ministry_signup_selections')
    .select(`
      role,
      ministry_id,
      signup:ministry_signups(name, email)
    `)
    .eq('role', 'lider')

  console.log('=== LÍDERES ATUAIS NOS MINISTÉRIOS (ministry_members) ===\n')

  const ministryMap = {}
  for (const m of ministries) ministryMap[m.id] = m

  for (const leader of leaders) {
    const ministry = ministryMap[leader.ministry_id]
    if (!ministry) continue
    
    // Verificar se essa pessoa realmente marcou líder no formulário
    const formMatch = selections?.find(s => {
      const signup = s.signup
      return signup && signup.email?.toLowerCase() === leader.email?.toLowerCase() && s.ministry_id === leader.ministry_id
    })

    const source = formMatch ? 'FORMULÁRIO' : 'INSERÇÃO MANUAL/SCRIPT'
    console.log(`${ministry.name} → ${leader.name} (${leader.email}) [${leader.role}] — Fonte: ${source}`)
  }

  // Identificar líderes que foram inseridos pelo script promote-all mas no formulário marcaram "membro"
  console.log('\n\n=== POSSÍVEIS ERROS: marcaram MEMBRO no formulário mas estão como LÍDER ===\n')

  for (const leader of leaders) {
    const ministry = ministryMap[leader.ministry_id]
    if (!ministry) continue

    // Verificar o que a pessoa marcou no formulário
    const { data: formSelections } = await supabase
      .from('ministry_signup_selections')
      .select('role, signup:ministry_signups(name, email)')
      .eq('ministry_id', leader.ministry_id)

    const personInForm = formSelections?.find(s => {
      const signup = s.signup
      return signup && signup.email?.toLowerCase() === leader.email?.toLowerCase()
    })

    if (personInForm && personInForm.role === 'membro' && (leader.role === 'lider')) {
      console.log(`  ❌ ${leader.name} | ${ministry.name} | No formulário: MEMBRO | No banco: LÍDER → CORRIGIR para MEMBRO`)
    }
  }
}

main()
