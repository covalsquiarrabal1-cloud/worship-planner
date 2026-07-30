import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Use service role to bypass RLS when checking role
  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  // Check if user is a ministry leader
  const { data: leaderMinistries } = await serviceClient
    .from('ministries')
    .select('id')
    .eq('leader_user_id', user.id)
    .limit(1)

  if (leaderMinistries && leaderMinistries.length > 0) {
    redirect('/membro')
  }

  redirect('/membro')
}
