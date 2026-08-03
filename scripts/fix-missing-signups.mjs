import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

function nick(n) { const p = n.split(' '); return p.length <= 2 ? n : `${p[0]} ${p[p.length-1]}` }

const people = [
  { name: 'Daniel Cristian', email: 'danielcristiansmartins@outlook.com' },
  { name: 'Mateus Luna', email: 'lunamateus999@gmail.com' },
  { name: 'Marcio Adriano Montanhez', email: 'marcioadriano2008@gmail.com' },
  { name: 'Geraldo Henrique Medeiros da Silva', email: 'heenriquemedeiros@gmail.com' },
  { name: 'Tatiana Renata dos Santos', email: 'taty_renata1@hotmail.com' },
  { name: 'Bruno Gustavo da Silva', email: 'brunogustavo.bgs@hotmail.com' },
  { name: 'Pedro Augusto Salesse', email: 'salessep@hotmail.com' },
  { name: 'Isaira Candido', email: 'isairacandido@gmail.com' },
  { name: 'Tatiane Freitas Arrabal', email: 'tatiane.arrabal@gmail.com' },
  { name: 'Gisele Ribeiro', email: 'giseleribeiro@gmail.com' },
  { name: 'Anizio Alves Dias Neto', email: 'anizioalvesdiasneto@gmail.com' },
  { name: 'Graziela Nunes', email: 'grazielanunes@gemail.com' },
  { name: 'Eliane', email: 'elieane@gmail.com' },
]

async function run() {
  for (const p of people) {
    const { error } = await c.from('ministry_signups').insert({
      name: p.name,
      email: p.email,
      nickname: nick(p.name),
      phone: '',
      birth_date: '1900-01-01',
    })
    console.log(error ? `ERR ${p.name}: ${error.message}` : `OK ${p.name}`)
  }
  console.log('Done!')
}

run().catch(console.error)
