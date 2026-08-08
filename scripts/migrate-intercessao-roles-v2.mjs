import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cwfeqngelvknvocvtcna.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'

const c = createClient(SUPABASE_URL, SERVICE_KEY)

async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  })
  if (!res.ok) {
    // Try direct SQL via pg endpoint
    const res2 = await fetch(`${SUPABASE_URL}/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    })
    return res2.ok
  }
  return true
}

async function run() {
  console.log('=== Migration: Intercessão Roles & Config ===\n')

  // Since we can't exec SQL via API, we'll create tables by attempting inserts
  // and checking if they work. The tables need to be created via Supabase Dashboard.

  console.log('⚠️  Você precisa executar o SQL abaixo no Supabase Dashboard (SQL Editor):')
  console.log('    Vá em: https://supabase.com/dashboard/project/cwfeqngelvknvocvtcna/sql/new\n')
  console.log(`
-- 1. Tabela de papéis por membro
CREATE TABLE IF NOT EXISTS intercessao_member_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES ministry_members(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN (
    'torre_domingo', 'torre_sexta', 'torre_strong', 'torre_empoderadas',
    'intercessor', 'coluna', 'suporte'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, role_type)
);

-- 2. Tabela de configuração de eventos
CREATE TABLE IF NOT EXISTS intercessao_event_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scale_name TEXT NOT NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('torre', 'intercessor', 'coluna', 'suporte')),
  num_people INTEGER NOT NULL DEFAULT 1,
  gender_filter TEXT NOT NULL DEFAULT 'any' CHECK (gender_filter IN ('male', 'female', 'any')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scale_name, role_type)
);

-- 3. Adicionar gender na ministry_members
ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));

-- 4. Inserir config padrão
INSERT INTO intercessao_event_config (scale_name, role_type, num_people, gender_filter) VALUES
  ('CELEBRAÇÃO', 'torre', 1, 'any'),
  ('CELEBRAÇÃO', 'intercessor', 2, 'any'),
  ('CELEBRAÇÃO', 'coluna', 1, 'any'),
  ('CELEBRAÇÃO', 'suporte', 2, 'any'),
  ('STRONGBROTHERS', 'torre', 1, 'male'),
  ('STRONGBROTHERS', 'intercessor', 6, 'male'),
  ('STRONGBROTHERS', 'coluna', 0, 'male'),
  ('STRONGBROTHERS', 'suporte', 1, 'male'),
  ('EMPODERADAS', 'torre', 1, 'female'),
  ('EMPODERADAS', 'intercessor', 2, 'female'),
  ('EMPODERADAS', 'coluna', 1, 'female'),
  ('EMPODERADAS', 'suporte', 2, 'female'),
  ('VIGÍLIA', 'torre', 1, 'any'),
  ('VIGÍLIA', 'intercessor', 99, 'any'),
  ('VIGÍLIA', 'coluna', 0, 'any'),
  ('VIGÍLIA', 'suporte', 99, 'any'),
  ('SALA DE CURA', 'torre', 0, 'any'),
  ('SALA DE CURA', 'intercessor', 1, 'any'),
  ('SALA DE CURA', 'coluna', 0, 'any'),
  ('SALA DE CURA', 'suporte', 0, 'any')
ON CONFLICT (scale_name, role_type) DO NOTHING;
`)

  console.log('\n--- Após executar o SQL acima, rode este script novamente com --populate ---\n')

  if (!process.argv.includes('--populate')) {
    return
  }

  console.log('Populando dados...\n')

  // Populate gender from main members table
  const { data: mainMembers } = await c.from('members').select('email, gender')
  const { data: ministry } = await c.from('ministries').select('id').eq('slug', 'intercessao').single()
  if (!ministry) { console.log('❌ Ministry not found'); return }

  const { data: intMembers } = await c.from('ministry_members')
    .select('id, name, email, gender')
    .eq('ministry_id', ministry.id)
    .eq('is_blocked', false)

  if (!intMembers || intMembers.length === 0) { console.log('❌ No members'); return }

  // Update gender
  const emailGenderMap = {}
  for (const m of mainMembers || []) {
    if (m.email) emailGenderMap[m.email.toLowerCase()] = m.gender
  }

  let genderUpdated = 0
  for (const mm of intMembers) {
    if (mm.gender) continue
    if (!mm.email) continue
    const gender = emailGenderMap[mm.email.toLowerCase()]
    if (gender) {
      await c.from('ministry_members').update({ gender }).eq('id', mm.id)
      genderUpdated++
    }
  }
  console.log(`✓ Gender atualizado para ${genderUpdated} membros`)

  // Populate roles based on the spreadsheet data
  const roleAssignments = {
    torre_domingo: ['Anizio Alves Dias Neto', 'Luis Henrique Elias do Amaral'],
    torre_sexta: ['Claudio Anselmo Gomes', 'Luis Henrique Elias do Amaral'],
    torre_strong: ['Marcos Batista Borges Junior'],
    torre_empoderadas: ['Graziela Nunes'],
    intercessor: [
      'Alan Dias', 'Anizio Alves Dias Neto', 'Estela Prates Costa de Oliveira',
      'Gabriel Pinto Candido', 'Gisele Ribeiro', 'Graziela Nunes',
      'Isaira Candido', 'Laura Meira', 'Luis Henrique Elias do Amaral',
      'Marcos Batista Borges Junior', 'Maria Eduarda da Silva Azeredo',
      'Maria Morais', 'Mario Augusto Leonel da Silva', 'Michele Santos',
      'Milena Sayuri Piovam Dias', 'Nicole Nunes',
    ],
    coluna: [
      'Anizio Alves Dias Neto', 'Gabriel Pinto Candido', 'Graziela Nunes',
      'Laura Meira', 'Marcos Batista Borges Junior', 'Mario Augusto Leonel da Silva',
      'Michele Santos',
    ],
    suporte: [
      'Ana Laura de Morais Silva Almeida', 'Celina de Souza Mimim Dias',
      'Débora Talita Vieira Pinho', 'Eliane', 'Fernanda Camila de Almeida Câmara',
      'Moisés Martins',
    ],
  }

  let totalInserted = 0
  for (const [roleType, names] of Object.entries(roleAssignments)) {
    for (const name of names) {
      // fuzzy match by first 12 chars
      const searchTerm = name.toLowerCase().slice(0, 12)
      const member = intMembers.find(m => m.name.toLowerCase().includes(searchTerm))
      if (member) {
        const { error } = await c.from('intercessao_member_roles').upsert(
          { member_id: member.id, role_type: roleType },
          { onConflict: 'member_id,role_type' }
        )
        if (!error) totalInserted++
        else console.log(`  ⚠️ ${name}/${roleType}: ${error.message}`)
      } else {
        console.log(`  ⚠️ Não encontrado: "${name}" (buscando "${searchTerm}")`)
      }
    }
  }
  console.log(`✓ ${totalInserted} papéis atribuídos`)

  // Insert default event config
  const configs = [
    { scale_name: 'CELEBRAÇÃO', role_type: 'torre', num_people: 1, gender_filter: 'any' },
    { scale_name: 'CELEBRAÇÃO', role_type: 'intercessor', num_people: 2, gender_filter: 'any' },
    { scale_name: 'CELEBRAÇÃO', role_type: 'coluna', num_people: 1, gender_filter: 'any' },
    { scale_name: 'CELEBRAÇÃO', role_type: 'suporte', num_people: 2, gender_filter: 'any' },
    { scale_name: 'STRONGBROTHERS', role_type: 'torre', num_people: 1, gender_filter: 'male' },
    { scale_name: 'STRONGBROTHERS', role_type: 'intercessor', num_people: 6, gender_filter: 'male' },
    { scale_name: 'STRONGBROTHERS', role_type: 'coluna', num_people: 0, gender_filter: 'male' },
    { scale_name: 'STRONGBROTHERS', role_type: 'suporte', num_people: 1, gender_filter: 'male' },
    { scale_name: 'EMPODERADAS', role_type: 'torre', num_people: 1, gender_filter: 'female' },
    { scale_name: 'EMPODERADAS', role_type: 'intercessor', num_people: 2, gender_filter: 'female' },
    { scale_name: 'EMPODERADAS', role_type: 'coluna', num_people: 1, gender_filter: 'female' },
    { scale_name: 'EMPODERADAS', role_type: 'suporte', num_people: 2, gender_filter: 'female' },
    { scale_name: 'VIGÍLIA', role_type: 'torre', num_people: 1, gender_filter: 'any' },
    { scale_name: 'VIGÍLIA', role_type: 'intercessor', num_people: 99, gender_filter: 'any' },
    { scale_name: 'VIGÍLIA', role_type: 'coluna', num_people: 0, gender_filter: 'any' },
    { scale_name: 'VIGÍLIA', role_type: 'suporte', num_people: 99, gender_filter: 'any' },
    { scale_name: 'SALA DE CURA', role_type: 'torre', num_people: 0, gender_filter: 'any' },
    { scale_name: 'SALA DE CURA', role_type: 'intercessor', num_people: 1, gender_filter: 'any' },
    { scale_name: 'SALA DE CURA', role_type: 'coluna', num_people: 0, gender_filter: 'any' },
    { scale_name: 'SALA DE CURA', role_type: 'suporte', num_people: 0, gender_filter: 'any' },
  ]

  for (const cfg of configs) {
    const { error } = await c.from('intercessao_event_config').upsert(cfg, { onConflict: 'scale_name,role_type' })
    if (error) console.log(`  Config ${cfg.scale_name}/${cfg.role_type}: ${error.message}`)
  }
  console.log('✓ Configuração de eventos inserida')

  console.log('\n✅ Migration completa!')
}

run().catch(console.error)
