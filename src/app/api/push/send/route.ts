import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:covalsqui.arrabal1@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const serviceClient = await createServiceRoleClient()
  
  // Check permission: admin or ministry leader
  const { data: profile } = await serviceClient
    .from('profiles').select('role').eq('id', user.id).single()
  
  const isAdmin = profile?.role === 'admin'
  
  if (!isAdmin) {
    // Check if user is a ministry leader
    const { data: leaderMinistries } = await serviceClient
      .from('ministries')
      .select('id')
      .eq('leader_user_id', user.id)
      .limit(1)
    
    if (!leaderMinistries || leaderMinistries.length === 0) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
  }

  const { title, body, url, memberIds, ministrySlug } = await request.json()
  if (!title || !body) return NextResponse.json({ error: 'title e body obrigatórios' }, { status: 400 })

  let subscriptions: any[] = []

  if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
    // Send to specific members by their member IDs (ministry_members.id)
    // First get their emails, then find their user_ids via profiles
    const { data: members } = await serviceClient
      .from('ministry_members')
      .select('email')
      .in('id', memberIds)

    const emails = (members || []).map(m => m.email?.toLowerCase()).filter(Boolean)

    if (emails.length > 0) {
      const { data: profiles } = await serviceClient
        .from('profiles')
        .select('id')
        .in('email', emails)

      const userIds = (profiles || []).map(p => p.id)
      
      if (userIds.length > 0) {
        const { data } = await serviceClient
          .from('push_subscriptions')
          .select('*')
          .in('user_id', userIds)
        subscriptions = data || []
      }
    }
  } else if (ministrySlug) {
    // Send to all members of a specific ministry
    const { data: ministry } = await serviceClient
      .from('ministries')
      .select('id')
      .eq('slug', ministrySlug)
      .single()

    if (ministry) {
      const { data: members } = await serviceClient
        .from('ministry_members')
        .select('email')
        .eq('ministry_id', ministry.id)
        .eq('is_blocked', false)

      const emails = (members || []).map(m => m.email?.toLowerCase()).filter(Boolean)

      if (emails.length > 0) {
        const { data: profiles } = await serviceClient
          .from('profiles')
          .select('id')
          .in('email', emails)

        const userIds = (profiles || []).map(p => p.id)

        if (userIds.length > 0) {
          const { data } = await serviceClient
            .from('push_subscriptions')
            .select('*')
            .in('user_id', userIds)
          subscriptions = data || []
        }
      }
    }
  } else {
    // Admin: send to all
    const { data } = await serviceClient.from('push_subscriptions').select('*')
    subscriptions = data || []
  }

  if (subscriptions.length === 0) {
    return NextResponse.json({ success: true, sent: 0, failed: 0, message: 'Nenhum dispositivo registrado' })
  }

  const payload = JSON.stringify({ title, body, url: url || '/membro' })
  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, payload)
      sent++
    } catch (err: any) {
      failed++
      if (err.statusCode === 410 || err.statusCode === 404) {
        await serviceClient.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return NextResponse.json({ success: true, sent, failed })
}
