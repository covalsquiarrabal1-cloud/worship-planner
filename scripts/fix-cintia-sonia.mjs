import { createClient } from '@supabase/supabase-js'
const c = createClient('https://cwfeqngelvknvocvtcna.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg')

async function run() {
  // 1. Update Cíntia's email in momentos_members
  const { data: cintia } = await c.from('momentos_members')
    .select('id, name, nickname')
    .ilike('nickname', '%cíntia%')
  
  if (cintia && cintia.length > 0) {
    await c.from('momentos_members').update({ 
      email: 'cintiadani5@hotmail.com',
      name: 'Cintia Daniele de Souza Barboza Libraiz',
    }).eq('id', cintia[0].id)
    console.log('✓ Cíntia email atualizado')
  }

  // 2. Update Sonia's email in momentos_members
  const { data: sonia } = await c.from('momentos_members')
    .select('id, name, nickname')
    .ilike('nickname', '%sonia%')
  
  if (sonia && sonia.length > 0) {
    await c.from('momentos_members').update({ 
      email: 'soniameira@gmail.com',
    }).eq('id', sonia[0].id)
    console.log('✓ Sonia email atualizado')
  }

  // 3. Cadastrar Sonia no ministry_signups (cadastro geral)
  const { data: existing } = await c.from('ministry_signups')
    .select('id')
    .ilike('email', 'soniameira@gmail.com')
  
  if (!existing || existing.length === 0) {
    await c.from('ministry_signups').insert({
      name: 'Sonia Meira',
      email: 'soniameira@gmail.com',
      nickname: 'Sonia Meira',
    })
    console.log('✓ Sonia cadastrada no ministry_signups')
  } else {
    console.log('  Sonia já existe no ministry_signups')
  }

  // 4. Cadastrar Cíntia no ministry_signups se não existir
  const { data: existingC } = await c.from('ministry_signups')
    .select('id')
    .ilike('email', 'cintiadani5@hotmail.com')
  
  if (!existingC || existingC.length === 0) {
    await c.from('ministry_signups').insert({
      name: 'Cintia Daniele de Souza Barboza Libraiz',
      email: 'cintiadani5@hotmail.com',
      nickname: 'Cíntia',
    })
    console.log('✓ Cíntia cadastrada no ministry_signups')
  } else {
    console.log('  Cíntia já existe no ministry_signups')
  }

  console.log('\n✅ Concluído!')
}

run().catch(console.error)
