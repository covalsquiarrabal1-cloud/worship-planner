import { createClient } from '@supabase/supabase-js'

const c = createClient(
  'https://cwfeqngelvknvocvtcna.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZmVxbmdlbHZrbnZvY3Z0Y25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDUzMTIxMCwiZXhwIjoyMTAwMTA3MjEwfQ.0l3Mq6Ben8THFz5OwCUjgVHW9Ww01Ne2DiukRspdMzg'
)

async function run() {
  const oldEmail = 'covalsqui.arrabal@gmail.com'
  const newEmail = 'covalsqui.arrabal1@gmail.com'

  // 1. Update members entry from old email to new email
  const { error: e1 } = await c.from('members')
    .update({ name: 'Covalsqui Arrabal', email: newEmail })
    .ilike('email', oldEmail)
  console.log('members update:', e1 ? e1.message : 'OK')

  // 2. Remove old person_roles entry
  const { error: e2 } = await c.from('member_person_roles')
    .delete()
    .eq('member_email', oldEmail)
  console.log('person_roles delete:', e2 ? e2.message : 'OK')

  // 3. Check for duplicate members entries with new email
  const { data: mems } = await c.from('members')
    .select('id, name, email')
    .ilike('email', newEmail)
  console.log('members com novo email:', mems?.length)

  // If there are 2, remove the one with "Min." prefix
  if (mems && mems.length > 1) {
    const toDelete = mems.find(m => m.name.startsWith('Min.'))
    if (toDelete) {
      await c.from('members').delete().eq('id', toDelete.id)
      console.log('Removed duplicate:', toDelete.name)
    }
  }

  // 4. Verify final state
  const { data: final } = await c.from('members')
    .select('id, name, email')
    .ilike('email', newEmail)
  console.log('Final members:', final?.map(m => m.name))

  console.log('Done!')
}

run().catch(console.error)
