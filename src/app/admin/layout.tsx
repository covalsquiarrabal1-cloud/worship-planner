import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AdminBottomNav } from '@/components/BottomNav'
import { LogoutButton } from '@/components/LogoutButton'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Use service role to bypass RLS when checking admin role
  const serviceClient = await createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/membro')

  // Load header image
  const { data: headerSetting } = await serviceClient
    .from('app_settings')
    .select('value')
    .eq('key', 'header_image')
    .single()

  const headerImage = headerSetting?.value || null

  return (
    <div style={{ overflowX: 'hidden', width: '100%', maxWidth: '100vw', position: 'relative' }}>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] overflow-hidden">
        {headerImage ? (
          <div className="relative">
            <img src={headerImage} alt="" className="w-full h-14 object-cover" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-between px-6">
              <div className="w-8" />
              <h1 className="text-lg font-bold text-white drop-shadow-md">Worship Planner</h1>
              <LogoutButton />
            </div>
          </div>
        ) : (
          <div className="bg-[var(--background)] px-6 py-4">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div className="w-8" />
              <h1 className="text-lg font-bold">Worship Planner</h1>
              <LogoutButton />
            </div>
          </div>
        )}
      </header>
      <main className="px-6 py-6 max-w-5xl mx-auto">
        {children}
        {/* Spacer for bottom nav */}
        <div style={{ height: '80px' }} aria-hidden="true" />
      </main>
      <AdminBottomNav />
    </div>
  )
}
