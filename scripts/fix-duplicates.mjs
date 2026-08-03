import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

// Corrections: email -> correct name
const nameFixes = {
  'mii.muniz00@gmail.com': 'Michele Santos',
  'lucashenrique010713@gmail.com': 'Lucas Henrique Antunes Silva',
  'matheustrombini3@gmail.com': 'Matheus Henrique Trombini Ferreira Pinto',
  'iasmimmica0@gmail.com': 'Iasmim de Amorin',
  'pedroafonsobogaz@gmail.com': 'Pedro Afonso Bogaz de Araújo',
  'liliabraga1993@gmail.com': 'Lília Maria da Silva Braga Luna',
  'andredinizsb@gmail.com': 'André Diniz Silva Brito',
  'leticiasantos.arch@gmail.com': 'Letícia de Souza Santos',
  'francielimorais07@gmail.com': 'Francieli Morais',
  'ericamariaa704@gmail.com': 'Érica Maria da Silva Alencar',
  'tatiane.arrabal@gmail.com': 'Tatiane Freitas Arrabal',
  'moisesmartins000@gmail.com': 'Moisés Martins',
  'durvalpedrosouza@gmail.com': 'Durval Pedro Souza',
}

// Email typo fix
const emailFix = {
  old: 'cintiadani5@hitmail.com',
  new: 'cintiadani5@hotmail.com',
}

async function run() {
  const tables = ['members', 'ministry_members', 'ministry_signups', 'profiles']

  // Fix names
  for (const [email, correctName] of Object.entries(nameFixes)) {
    for (const table of tables) {
      const col = table === 'profiles' ? 'full_name' : 'name'
      const { error, count } = await c
        .from(table)
        .update({ [col]: correctName })
        .ilike('email', email)

      if (error && !error.message.includes('column')) {
        // ignore if table doesn't have the column
      }
    }
    console.log(`✓ ${email} -> ${correctName}`)
  }

  // Fix email typo
  for (const table of tables) {
    await c.from(table).update({ email: emailFix.new }).ilike('email', emailFix.old)
  }
  // Also fix in member_person_roles
  await c.from('member_person_roles').update({ member_email: emailFix.new }).eq('member_email', emailFix.old)
  console.log(`✓ Email fix: ${emailFix.old} -> ${emailFix.new}`)

  // Verify
  console.log('\n--- Verificando ---')
  for (const [email] of Object.entries(nameFixes)) {
    const { data: mm } = await c.from('ministry_members').select('name').ilike('email', email).limit(1)
    const { data: m } = await c.from('members').select('name').ilike('email', email).limit(1)
    const name = mm?.[0]?.name || m?.[0]?.name || '?'
    console.log(`${email}: ${name}`)
  }

  console.log('\nDone!')
}

run().catch(console.error)
