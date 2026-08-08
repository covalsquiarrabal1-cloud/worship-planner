import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  const aliveId = '6e643b3a-8c8a-4aec-95f0-ca8c43f5c6d9'

  // Members to remove from Alive (not in the PDF, didn't ask for Alive)
  const toRemove = [
    'Anizio Alves Dias Neto', 'Bianca', 'Claudio Anselmo Gomes', 'Gisele Ribeiro',
    'Isaira Candido', 'Laura Meira', 'Matheus Henrique Trombini Ferreira Pinto',
    'Milena Sayuri Piovam Dias', 'Moisés Martins', 'Sonia Meira'
  ]

  for (const name of toRemove) {
    const { data: member } = await c.from('ministry_members')
      .select('id, name')
      .eq('ministry_id', aliveId)
      .ilike('name', `%${name.slice(0, 12)}%`)

    if (member && member.length > 0) {
      const id = member[0].id
      // Remove assignments first
      await c.from('ministry_assignments').delete().eq('member_id', id)
      // Remove member
      await c.from('ministry_members').delete().eq('id', id)
      console.log(`✓ Removido do Alive: ${member[0].name}`)
    } else {
      console.log(`⚠️ Não encontrado: ${name}`)
    }
  }

  // Final count
  const { data: final } = await c.from('ministry_members')
    .select('id, name, nickname')
    .eq('ministry_id', aliveId)
    .eq('is_blocked', false)
    .order('name')
  
  console.log(`\n✅ Alive agora tem ${final?.length} membros:`)
  final?.forEach(m => console.log(`  - ${m.nickname || m.name}`))
}

run().catch(console.error)
