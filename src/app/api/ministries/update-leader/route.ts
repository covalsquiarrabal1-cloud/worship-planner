import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Only admin
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { ministryId, leaderName, leaderEmail } = await request.json()
  if (!ministryId) return NextResponse.json({ error: 'ID do ministério obrigatório' }, { status: 400 })

  const normalizedEmail = leaderEmail?.trim().toLowerCase() || null

  // Find the user profile for this email to link leader_user_id
  let leaderUserId: string | null = null
  if (normalizedEmail) {
    const { data: leaderProfile } = await serviceClient
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .single()

    if (leaderProfile) {
      leaderUserId = leaderProfile.id
    } else {
      // Try to find in auth
      const { data: { users } } = await serviceClient.auth.admin.listUsers()
      const authUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail)
      if (authUser) {
        leaderUserId = authUser.id
        // Create profile if missing
        await serviceClient.from('profiles').upsert({
          id: authUser.id,
          email: normalizedEmail,
          full_name: leaderName || '',
          role: 'member',
        }, { onConflict: 'id' })
      }
    }
  }

  const { error } = await serviceClient
    .from('ministries')
    .update({
      leader_name: leaderName?.trim() || null,
      leader_user_id: leaderUserId,
    })
    .eq('id', ministryId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, leader_user_id: leaderUserId })
}
