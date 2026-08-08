import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  const aliveId = '6e643b3a-8c8a-4aec-95f0-ca8c43f5c6d9'
  const intId = 'd7e7adce-7086-4b24-9a35-fc3fd64a36bd'

  // Check if the 10 extras in Alive were added via signup form
  const extrasAlive = ['Anizio Alves Dias Neto', 'Bianca', 'Claudio Anselmo Gomes', 'Gisele Ribeiro',
    'Isaira Candido', 'Laura Meira', 'Matheus Henrique Trombini Ferreira Pinto',
    'Milena Sayuri Piovam Dias', 'Moisés Martins', 'Sonia Meira']

  console.log('=== Verificando origem dos 10 extras do Alive ===\n')

  const { data: signups } = await c.from('ministry_signups').select('name, email, other_ministry')
  
  for (const name of extrasAlive) {
    const signup = signups?.find(s => s.name.toLowerCase().includes(name.toLowerCase().slice(0, 10)))
    // Check if they signed up for Intercessao Alive specifically
    const signedUpForAlive = signup?.other_ministry?.toLowerCase().includes('alive') ||
      signup?.other_ministry?.toLowerCase().includes('intercess')
    console.log(`  ${name.slice(0, 30).padEnd(32)} | Formulário: ${signup ? 'SIM' : 'NÃO'} | Pediu Alive: ${signedUpForAlive ? 'SIM' : 'NÃO'}`)
  }

  // === CLEANUP ===
  console.log('\n=== Removendo extras da Intercessão ===')
  
  // Remove "Gisele Ferreira Neres Ribeiro" (duplicate of "Gisele Ribeiro")
  const { data: gisele2 } = await c.from('ministry_members')
    .select('id, name')
    .eq('ministry_id', intId)
    .ilike('name', '%Gisele Ferreira%')
  if (gisele2?.length) {
    // Check if has assignments first
    const { data: assignments } = await c.from('ministry_assignments').select('id').eq('member_id', gisele2[0].id)
    if (assignments?.length) {
      console.log(`  ⚠️ Gisele Ferreira tem ${assignments.length} assignments - removendo assignments primeiro`)
      await c.from('ministry_assignments').delete().eq('member_id', gisele2[0].id)
    }
    await c.from('ministry_members').delete().eq('id', gisele2[0].id)
    console.log(`  ✓ Removida: Gisele Ferreira Neres Ribeiro`)
  }

  // Remove "Jéssica de Amorin Barroso"
  const { data: jessica } = await c.from('ministry_members')
    .select('id, name')
    .eq('ministry_id', intId)
    .ilike('name', '%Jéssica%Amorin%')
  if (jessica?.length) {
    const { data: assignments } = await c.from('ministry_assignments').select('id').eq('member_id', jessica[0].id)
    if (assignments?.length) {
      await c.from('ministry_assignments').delete().eq('member_id', jessica[0].id)
    }
    await c.from('ministry_members').delete().eq('id', jessica[0].id)
    console.log(`  ✓ Removida: Jéssica de Amorin Barroso`)
  }

  // Final counts
  const { data: finalInt } = await c.from('ministry_members').select('id').eq('ministry_id', intId).eq('is_blocked', false)
  const { data: finalAlive } = await c.from('ministry_members').select('id').eq('ministry_id', aliveId).eq('is_blocked', false)
  console.log(`\n✅ Intercessão: ${finalInt?.length} membros`)
  console.log(`✅ Alive: ${finalAlive?.length} membros`)
}

run().catch(console.error)
