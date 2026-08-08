import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

// Based on names - manual gender assignment
const genderMap = {
  'Alan Dias': 'male',
  'Ana Laura de Morais Silva Almeida': 'female',
  'Anizio Alves Dias Neto': 'male',
  'Celina de Souza Mimim Dias': 'female',
  'Claudio Anselmo Gomes': 'male',
  'Débora Talita Vieira Pinho': 'female',
  'Eliane': 'female',
  'Estela Prates Costa de Oliveira': 'female',
  'Fernanda Camila de Almeida Câmara': 'female',
  'Gabriel Pinto Candido': 'male',
  'Gisele Ribeiro': 'female',
  'Graziela Nunes': 'female',
  'Isaira Candido': 'female',
  'Jéssica de Amorin Barroso': 'female',
  'Laura Meira': 'female',
  'Luis Henrique Elias do Amaral': 'male',
  'Marcos Batista Borges Junior': 'male',
  'Maria Eduarda da Silva Azeredo': 'female',
  'Maria Morais': 'female',
  'Mario Augusto Leonel da Silva': 'male',
  'Milena Sayuri Piovam Dias': 'female',
}

async function run() {
  const { data: ministry } = await c.from('ministries').select('id').eq('slug', 'intercessao').single()
  const { data: members } = await c.from('ministry_members')
    .select('id, name, gender')
    .eq('ministry_id', ministry.id)
    .eq('is_blocked', false)

  let updated = 0
  for (const m of members) {
    if (m.gender) continue
    const gender = genderMap[m.name]
    if (gender) {
      await c.from('ministry_members').update({ gender }).eq('id', m.id)
      console.log(`✓ ${m.name} -> ${gender}`)
      updated++
    } else {
      console.log(`⚠️ ${m.name} - não encontrado no mapa`)
    }
  }
  console.log(`\n✅ ${updated} membros atualizados`)
}

run().catch(console.error)
