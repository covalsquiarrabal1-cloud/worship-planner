import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function main() {
  // 1. Buscar pessoas que preencheram "outro ministério"
  const { data: others, error: othersErr } = await supabase
    .from('ministry_signups')
    .select('name, email, other_ministry, other_role')
    .not('other_ministry', 'is', null)
    .neq('other_ministry', '')
    .order('other_ministry')

  if (othersErr) { console.error('Erro:', othersErr); return }

  // 2. Buscar todos os ministérios cadastrados
  const { data: ministries } = await supabase
    .from('ministries')
    .select('id, name, slug')
    .order('name')

  console.log('\n=== PESSOAS QUE NÃO ENCONTRARAM O MINISTÉRIO ===\n')
  console.log(`Total: ${others.length}\n`)

  const ministryNames = ministries.map(m => m.name.toLowerCase())
  const canInsert = []
  const needReview = []

  for (const person of others) {
    const otherMin = person.other_ministry.trim().toLowerCase()
    
    // Tentar encontrar correspondência nos ministérios existentes
    let match = ministries.find(m => 
      m.name.toLowerCase() === otherMin ||
      m.slug === otherMin ||
      m.name.toLowerCase().includes(otherMin) ||
      otherMin.includes(m.name.toLowerCase())
    )

    // Mapeamentos manuais conhecidos
    const manualMap = {
      'adoração - louvor': null, // louvor é sistema principal, não ministry_members
      'adoração': null,
      'louvor': null,
      'actv': null,
      'alive up': 'alive',
      'não participo': null,
      'líder de célula': 'conexao',
      'lider de celula': 'conexao',
      'conexão e finanças': null, // precisa split
      'ministério excelência': 'excelencia',
      'ministerio excelencia': 'excelencia',
      'kids': 'kids',
    }

    const manualSlug = manualMap[otherMin]
    if (manualSlug) {
      match = ministries.find(m => m.slug === manualSlug)
    }

    if (match) {
      canInsert.push({ ...person, ministry: match })
    } else if (manualSlug === null && manualMap.hasOwnProperty(otherMin)) {
      needReview.push({ ...person, reason: otherMin === 'não participo' ? 'Não participa' : 'Louvor (sistema principal)' })
    } else {
      needReview.push({ ...person, reason: `Ministério "${person.other_ministry}" não encontrado` })
    }
  }

  console.log('--- PODE INSERIR AUTOMATICAMENTE ---\n')
  for (const p of canInsert) {
    console.log(`  ${p.name} | ${p.email} | → ${p.ministry.name} (${p.other_role || 'membro'})`)
  }

  console.log(`\n--- PRECISA REVISÃO MANUAL (${needReview.length}) ---\n`)
  for (const p of needReview) {
    console.log(`  ${p.name} | ${p.email} | "${p.other_ministry}" (${p.other_role || '-'}) | Motivo: ${p.reason}`)
  }

  // 3. Gerar SQL de inserção para os que podem ser inseridos
  if (canInsert.length > 0) {
    console.log('\n\n=== SQL PARA INSERIR ===\n')
    for (const p of canInsert) {
      const role = (p.other_role || '').toLowerCase().includes('líder') || (p.other_role || '').toLowerCase().includes('lider') ? 'lider' : 'membro'
      console.log(`INSERT INTO ministry_members (ministry_id, name, email, role) VALUES ('${p.ministry.id}', '${p.name.replace(/'/g, "''")}', '${p.email.toLowerCase().replace(/'/g, "''")}', '${role}') ON CONFLICT DO NOTHING;`)
    }
  }
}

main()
