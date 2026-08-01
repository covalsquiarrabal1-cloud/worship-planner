import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

// Preposições que ficam em minúscula
const lowercase = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos']

function capitalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && lowercase.includes(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

async function main() {
  // Corrigir ministry_members
  const { data: members } = await supabase.from('ministry_members').select('id, name')
  let updated = 0
  for (const m of members || []) {
    const fixed = capitalizeName(m.name)
    if (fixed !== m.name) {
      await supabase.from('ministry_members').update({ name: fixed }).eq('id', m.id)
      updated++
    }
  }
  console.log(`ministry_members: ${updated} nomes corrigidos`)

  // Corrigir ministry_signups
  const { data: signups } = await supabase.from('ministry_signups').select('id, name')
  let updated2 = 0
  for (const s of signups || []) {
    const fixed = capitalizeName(s.name)
    if (fixed !== s.name) {
      await supabase.from('ministry_signups').update({ name: fixed }).eq('id', s.id)
      updated2++
    }
  }
  console.log(`ministry_signups: ${updated2} nomes corrigidos`)

  // Corrigir members (louvor)
  const { data: worshipMembers } = await supabase.from('members').select('id, name')
  let updated3 = 0
  for (const m of worshipMembers || []) {
    const fixed = capitalizeName(m.name)
    if (fixed !== m.name) {
      await supabase.from('members').update({ name: fixed }).eq('id', m.id)
      updated3++
    }
  }
  console.log(`members (louvor): ${updated3} nomes corrigidos`)

  console.log('\nFinalizado!')
}

main()
