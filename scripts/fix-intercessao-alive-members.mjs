import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  // Get ministry IDs
  const { data: intercessao } = await c.from('ministries').select('id').eq('slug', 'intercessao').single()
  const { data: alive } = await c.from('ministries').select('id').eq('slug', 'intercessao-alive').single()
  
  console.log('Intercessão ID:', intercessao?.id)
  console.log('Alive ID:', alive?.id)

  // Get current members of each
  const { data: intMembers } = await c.from('ministry_members')
    .select('id, name, nickname, email')
    .eq('ministry_id', intercessao.id)
    .eq('is_blocked', false)
    .order('name')

  const { data: aliveMembers } = await c.from('ministry_members')
    .select('id, name, nickname, email')
    .eq('ministry_id', alive.id)
    .eq('is_blocked', false)
    .order('name')

  console.log(`\n=== Intercessão: ${intMembers?.length} membros ===`)
  intMembers?.forEach(m => console.log(`  ${m.nickname || m.name}`))

  console.log(`\n=== Intercessão Alive: ${aliveMembers?.length} membros ===`)
  aliveMembers?.forEach(m => console.log(`  ${m.nickname || m.name}`))

  // Expected members from PDF - Intercessão Alive
  const expectedAlive = [
    'Nicole Nunes', 'Bruna Gomes Silva de Brito', 'Luciano Carvalho de Brito',
    'Mario Augusto Leonel da Silva', 'Graziela Nunes', 'Michele Santos',
    'Marcos Batista Borges Junior', 'Luis Henrique Elias do Amaral',
    'Livia Rebeca Candido Gois', 'Adriele Morais da Silva',
    'Francieli Morais', 'Maria Luiza Santaterra',
    'Ana Laura de Morais Silva Almeida', 'Camili Vitória de Moraes da Silva',
    'Caroline Antunes', 'Maria Sophia Santaterra',
  ]

  // Check who's missing from Alive
  console.log('\n=== Verificando membros do Alive (PDF) ===')
  const aliveEmails = new Set(aliveMembers?.map(m => m.email?.toLowerCase()) || [])
  const aliveNames = new Set(aliveMembers?.map(m => m.name.toLowerCase()) || [])

  for (const name of expectedAlive) {
    const found = aliveMembers?.find(m => 
      m.name.toLowerCase().includes(name.toLowerCase().slice(0, 10)) ||
      name.toLowerCase().includes((m.nickname || m.name).toLowerCase().slice(0, 8))
    )
    if (found) {
      console.log(`  ✓ ${name} -> encontrado como "${found.nickname || found.name}"`)
    } else {
      console.log(`  ⚠️ ${name} -> NÃO ENCONTRADO no Alive`)
    }
  }

  // Expected members from PDF - Intercessão
  const expectedInt = [
    'Anizio Alves Dias Neto', 'Gabriel Pinto Candido', 'Gisele Ribeiro',
    'Nicole Nunes', 'Marcos Batista Borges Junior', 'Graziela Nunes',
    'Isaira Candido', 'Alan Dias', 'Laura Meira', 'Michele Santos',
    'Mario Augusto Leonel da Silva', 'Maria Eduarda da Silva Azeredo',
    'Estela Prates Costa de Oliveira', 'Milena Sayuri Piovam Dias',
    'Claudio Anselmo Gomes', 'Luis Henrique Elias do Amaral',
    'Moisés Martins', 'Ana Laura de Morais Silva Almeida',
    'Fernanda Camila de Almeida Câmara', 'Celina de Souza Mimim Dias',
    'Eliane Peres dos Santos', 'Débora Talita Vieira Pinho',
    'Maria Morais',
  ]

  console.log('\n=== Verificando membros da Intercessão (PDF) ===')
  for (const name of expectedInt) {
    const found = intMembers?.find(m => 
      m.name.toLowerCase().includes(name.toLowerCase().slice(0, 10)) ||
      name.toLowerCase().includes((m.nickname || m.name).toLowerCase().slice(0, 8))
    )
    if (found) {
      console.log(`  ✓ ${name.slice(0, 25)}`)
    } else {
      console.log(`  ⚠️ ${name} -> NÃO ENCONTRADO na Intercessão`)
    }
  }

  // Check for people in Intercessão who shouldn't be (not in PDF)
  console.log('\n=== Membros na Intercessão que NÃO estão no PDF ===')
  for (const m of intMembers || []) {
    const found = expectedInt.find(name => 
      m.name.toLowerCase().includes(name.toLowerCase().slice(0, 10)) ||
      name.toLowerCase().includes(m.name.toLowerCase().slice(0, 10))
    )
    if (!found) {
      console.log(`  ❌ ${m.name} (possivelmente não pertence à Intercessão)`)
    }
  }

  console.log('\n=== Membros no Alive que NÃO estão no PDF ===')
  for (const m of aliveMembers || []) {
    const found = expectedAlive.find(name => 
      m.name.toLowerCase().includes(name.toLowerCase().slice(0, 10)) ||
      name.toLowerCase().includes(m.name.toLowerCase().slice(0, 10))
    )
    if (!found) {
      console.log(`  ❌ ${m.name} (possivelmente não pertence ao Alive)`)
    }
  }
}

run().catch(console.error)
