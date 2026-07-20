import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServiceRoleClient()

  // Create admin user
  const { data: user, error } = await supabase.auth.admin.createUser({
    email: 'covalsqui.arrabal1@gmail.com',
    password: 'cov123',
    email_confirm: true,
    user_metadata: { full_name: 'Covalsqui' },
  })

  if (error && !error.message.includes('already been registered')) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    message: 'Admin user created successfully',
    user: user?.user?.id || 'already exists',
  })
}
