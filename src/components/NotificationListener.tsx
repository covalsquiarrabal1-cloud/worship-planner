'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  title: string
  body: string
  url: string | null
  is_read: boolean
  created_at: string
}

export default function NotificationListener() {
  const [toast, setToast] = useState<Notification | null>(null)
  const supabase = createClient()

  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 880 // A5 note
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3

      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (e) {
      // Audio not available
    }
  }, [])

  const vibrate = useCallback(() => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]) // vibra 200ms, pausa 100ms, vibra 200ms
      }
    } catch (e) {
      // Vibration not available
    }
  }, [])

  useEffect(() => {
    let channel: any = null

    async function setup() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Subscribe to realtime notifications for this user
      channel = supabase
        .channel('notifications-' + user.id)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            const notification = payload.new as Notification
            // Show toast
            setToast(notification)
            // Play beep + vibrate
            playBeep()
            vibrate()
            // Auto-hide after 6 seconds
            setTimeout(() => setToast(null), 6000)
          }
        )
        .subscribe()
    }

    setup()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, playBeep, vibrate])

  if (!toast) return null

  return (
    <div
      className="fixed top-4 left-4 right-4 z-[9999] animate-slide-down"
      onClick={() => {
        if (toast.url) window.location.href = toast.url
        setToast(null)
      }}
    >
      <div className="max-w-sm mx-auto bg-[#1c2128] border border-[#58a6ff]/50 rounded-2xl p-4 shadow-xl shadow-[#58a6ff]/10 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#58a6ff]/20 flex items-center justify-center shrink-0">
            <span className="text-lg">🔔</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{toast.title}</p>
            <p className="text-xs text-[#8b949e] mt-0.5 line-clamp-2">{toast.body}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setToast(null) }}
            className="text-[#8b949e] hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
