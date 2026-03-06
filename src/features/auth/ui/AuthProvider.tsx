'use client'

import { useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuthStore } from '../model/authStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth(session?.user ?? null, session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuth(session?.user ?? null, session)
      }
    )

    return () => subscription.unsubscribe()
  }, [setAuth, setLoading])

  return <>{children}</>
}
