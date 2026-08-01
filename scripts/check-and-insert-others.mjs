import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

const PEOPLE = [
  { name: 'Ricardo Libraiz', email: 'rlibraiz@hotmail.com', ministrySlug: 'ac-casais', role: 'lider' },
  { name: 'Luciano Carvalho de Brito', email: 'lucianocarvalho98@hotmail.com', ministrySlug: 'alive', role: 'lider' },
  { name: 'Tatieli Saraiva da Silva', email: 'tikaelly@yahoo.com.br', ministrySlug: 'conexao', role: 'ambos' },
  { name: 'Adriana Costa Da Silva Amancio', email: 'adrianacostadasilvaamancio@gmail.com', ministrySlug: 'kids', role: 'lider' },
  { name: 'José Antonio Mimim Filho', email: 'joseantoniomimimfilho@gmail.com', ministrySlug: 'conexao', role: 'membro' },
  { name: 'durval Pedro Souza', email: 'durvalpedrosouza@gmail.com', ministrySlug: 'excelencia', role: 'ambos' },
]

async function main() {
  // Buscar ministérios
  const { data: ministries } = await supabase.from('ministries').select('id, name, slug')

  for (const person of PEOPLE) {
    const ministry = ministries.find(m => m.slug === person.ministrySlug)
    if (!ministry) {
      console.log(`❌ Ministério "${person.ministrySlug}" não encontrado no banco!`)
      continue
    }

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('ministry_members')
      .select('id, name, email, role')
      .eq('ministry_id', ministry.id)
      .ilike('email', person.email)

    if (existing && existing.length > 0) {
      const current = existing[0]
      if (current.role === person.role) {
        console.log(`✓ ${person.name} já está em ${ministry.name} como ${person.role}`)
      } else {
        // Atualizar role
        const { error } = await supabase
          .from('ministry_members')
          .update({ role: person.role })
          .eq('id', current.id)
        if (error) {
          console.log(`❌ Erro ao atualizar ${person.name}: ${error.message}`)
        } else {
          console.log(`🔄 ${person.name} atualizado em ${ministry.name}: ${current.role} → ${person.role}`)
        }
      }
    } else {
      // Inserir
      const { error } = await supabase
        .from('ministry_members')
        .insert({ ministry_id: ministry.id, name: person.name, email: person.email.toLowerCase(), role: person.role })
      if (error) {
        console.log(`❌ Erro ao inserir ${person.name} em ${ministry.name}: ${error.message}`)
      } else {
        console.log(`✅ ${person.name} inserido em ${ministry.name} como ${person.role}`)
      }
    }
  }

  console.log('\nFinalizado!')
}

main()
