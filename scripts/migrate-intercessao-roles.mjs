import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function run() {
  // 1. Create intercessao_member_roles table
  const { error: e1 } = await c.rpc('exec_sql', { sql: `
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
  `})
  if (e1) console.log('Table intercessao_member_roles:', e1.message)
  else console.log('✓ intercessao_member_roles created')

  // 2. Create intercessao_event_config table
  const { error: e2 } = await c.rpc('exec_sql', { sql: `
    CREATE TABLE IF NOT EXISTS intercessao_event_config (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      scale_name TEXT NOT NULL,
      role_type TEXT NOT NULL CHECK (role_type IN ('torre', 'intercessor', 'coluna', 'suporte')),
      num_people INTEGER NOT NULL DEFAULT 1,
      gender_filter TEXT NOT NULL DEFAULT 'any' CHECK (gender_filter IN ('male', 'female', 'any')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(scale_name, role_type)
    );
  `})
  if (e2) console.log('Table intercessao_event_config:', e2.message)
  else console.log('✓ intercessao_event_config created')

  // 3. Insert default config
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
    if (error) console.log(`Config ${cfg.scale_name}/${cfg.role_type}:`, error.message)
  }
  console.log('✓ intercessao_event_config populated')

  // 4. Add gender column to ministry_members
  const { error: e4 } = await c.rpc('exec_sql', { sql: `
    ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));
  `})
  if (e4) console.log('Gender column:', e4.message)
  else console.log('✓ gender column added')

  // 5. Populate gender from main members table by email match
  const { data: mainMembers } = await c.from('members').select('email, gender')
  const { data: ministryMembers } = await c.from('ministry_members').select('id, email, gender')

  if (mainMembers && ministryMembers) {
    const emailGenderMap = {}
    for (const m of mainMembers) {
      if (m.email) emailGenderMap[m.email.toLowerCase()] = m.gender
    }

    let updated = 0
    for (const mm of ministryMembers) {
      if (mm.gender) continue // already set
      if (!mm.email) continue
      const gender = emailGenderMap[mm.email.toLowerCase()]
      if (gender) {
        await c.from('ministry_members').update({ gender }).eq('id', mm.id)
        updated++
      }
    }
    console.log(`✓ Updated gender for ${updated} ministry members`)
  }

  // 6. Populate intercessao_member_roles from existing data (based on August assignments)
  const { data: ministry } = await c.from('ministries').select('id').eq('slug', 'intercessao').single()
  if (!ministry) { console.log('Intercessao ministry not found'); return }

  const { data: intMembers } = await c.from('ministry_members')
    .select('id, name, gender')
    .eq('ministry_id', ministry.id)
    .eq('is_blocked', false)

  if (!intMembers) { console.log('No members'); return }

  // Based on the August schedule PDF data:
  const roleAssignments = {
    // Torre Domingo
    torre_domingo: ['Anizio Alves Dias Neto', 'Luis Henrique Elias do Amaral'],
    // Torre Sexta (Claudio para Vigília, Marcão para Strong)
    torre_sexta: ['Claudio Anselmo Gomes', 'Luis Henrique Elias do Amaral'],
    // Torre Strong
    torre_strong: ['Marcos Batista Borges Junior'],
    // Torre Empoderadas
    torre_empoderadas: ['Graziela Nunes'],
    // Intercessores (everyone who can be intercessor)
    intercessor: [
      'Alan Dias', 'Anizio Alves Dias Neto', 'Gabriel Pinto Candido',
      'Gisele Ribeiro', 'Nicole Nunes', 'Graziela Nunes', 'Isaira Candido',
      'Laura Meira', 'Michele Santos', 'Mario Augusto Leonel da Silva',
      'Maria Eduarda da Silva Azeredo', 'Estela Prates Costa de Oliveira',
      'Milena Sayuri Piovam Dias', 'Marcos Batista Borges Junior',
      'Luis Henrique Elias do Amaral', 'Claudio Anselmo Gomes',
      'Maria Morais',
    ],
    // Coluna
    coluna: [
      'Gabriel Pinto Candido', 'Marcos Batista Borges Junior', 'Anizio Alves Dias Neto',
      'Michele Santos', 'Mario Augusto Leonel da Silva', 'Laura Meira',
      'Graziela Nunes',
    ],
    // Suporte
    suporte: [
      'Ana Laura de Morais Silva Almeida', 'Fernanda Camila de Almeida Câmara',
      'Celina de Souza Mimim Dias', 'Eliane', 'Débora Talita Vieira Pinho',
      'Moisés Martins',
    ],
  }

  let totalInserted = 0
  for (const [roleType, names] of Object.entries(roleAssignments)) {
    for (const name of names) {
      const member = intMembers.find(m => m.name.toLowerCase().includes(name.toLowerCase().slice(0, 10)))
      if (member) {
        const { error } = await c.from('intercessao_member_roles').upsert(
          { member_id: member.id, role_type: roleType },
          { onConflict: 'member_id,role_type' }
        )
        if (!error) totalInserted++
        else if (!error.message?.includes('duplicate')) console.log(`Role ${name}/${roleType}:`, error.message)
      } else {
        console.log(`⚠️ Member not found: ${name}`)
      }
    }
  }
  console.log(`✓ Inserted ${totalInserted} role assignments`)

  console.log('\n✅ Migration complete!')
}

run().catch(console.error)
