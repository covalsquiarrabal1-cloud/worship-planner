import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()

  // Check admin permission
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { title, body, url, memberIds, sendToAll } = await request.json()
  if (!title || !body) return NextResponse.json({ error: 'title e body obrigatórios' }, { status: 400 })

  let targetUserIds: string[] = []

  if (sendToAll) {
    // Send to all members
    const { data: profiles } = await serviceClient
      .from('profiles').select('id').neq('role', 'admin')
    targetUserIds = (profiles || []).map(p => p.id)
  } else if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
    // Get user IDs from member emails (members table - louvor)
    const { data: members } = await serviceClient
      .from('members').select('email').in('id', memberIds)
    let emails = (members || []).map(m => m.email?.toLowerCase()).filter(Boolean)

    // Also check ministry_members table
    if (emails.length === 0) {
      const { data: ministryMembers } = await serviceClient
        .from('ministry_members').select('email').in('id', memberIds)
      emails = (ministryMembers || []).map(m => m.email?.toLowerCase()).filter(Boolean)
    }

    if (emails.length > 0) {
      const { data: profiles } = await serviceClient
        .from('profiles').select('id').in('email', emails)
      targetUserIds = (profiles || []).map(p => p.id)
    }
  }

  if (targetUserIds.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'Nenhum destinatário encontrado' })
  }

  // Insert notifications for all target users
  const notifications = targetUserIds.map(userId => ({
    user_id: userId,
    title,
    body,
    url: url || null,
    is_read: false,
  }))

  const { error } = await serviceClient.from('notifications').insert(notifications)
  if (error) {
    return NextResponse.json({ error: 'Erro ao enviar: ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, sent: targetUserIds.length })
}
