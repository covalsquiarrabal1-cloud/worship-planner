import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function run() {
  // STRONGBROTHERS: todos os homens intercessores + todos suportes
  await c.from('intercessao_event_config').upsert(
    { scale_name: 'STRONGBROTHERS', role_type: 'intercessor', num_people: 99, gender_filter: 'male' },
    { onConflict: 'scale_name,role_type' }
  )
  await c.from('intercessao_event_config').upsert(
    { scale_name: 'STRONGBROTHERS', role_type: 'suporte', num_people: 99, gender_filter: 'male' },
    { onConflict: 'scale_name,role_type' }
  )

  // EMPODERADAS: todas as mulheres intercessoras + todas suportes
  await c.from('intercessao_event_config').upsert(
    { scale_name: 'EMPODERADAS', role_type: 'intercessor', num_people: 99, gender_filter: 'female' },
    { onConflict: 'scale_name,role_type' }
  )
  await c.from('intercessao_event_config').upsert(
    { scale_name: 'EMPODERADAS', role_type: 'suporte', num_people: 99, gender_filter: 'female' },
    { onConflict: 'scale_name,role_type' }
  )
  await c.from('intercessao_event_config').upsert(
    { scale_name: 'EMPODERADAS', role_type: 'coluna', num_people: 1, gender_filter: 'female' },
    { onConflict: 'scale_name,role_type' }
  )

  // VIGÍLIA: todos (homens e mulheres)
  // Já está com 99, mas garantir gender_filter = 'any'
  await c.from('intercessao_event_config').upsert(
    { scale_name: 'VIGÍLIA', role_type: 'intercessor', num_people: 99, gender_filter: 'any' },
    { onConflict: 'scale_name,role_type' }
  )
  await c.from('intercessao_event_config').upsert(
    { scale_name: 'VIGÍLIA', role_type: 'suporte', num_people: 99, gender_filter: 'any' },
    { onConflict: 'scale_name,role_type' }
  )

  console.log('✓ Config atualizada!')
  
  // Verify
  const { data } = await c.from('intercessao_event_config').select('*').order('scale_name')
  console.table(data?.map(d => ({ evento: d.scale_name, funcao: d.role_type, qtd: d.num_people, genero: d.gender_filter })))
}

run().catch(console.error)
