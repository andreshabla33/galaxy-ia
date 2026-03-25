import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseInstance: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase env vars: define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

// Singleton Proxy to ensure only one instance of Supabase client exists
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    const client = getSupabaseClient()
    const value = client[prop as keyof ReturnType<typeof createClient>]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

export async function signInWithGoogle() {
  const redirectUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000/auth/callback'
    : `${window.location.origin}/auth/callback`
  
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl },
  })
}

export async function signInWithGithub() {
  const redirectUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000/auth/callback'
    : `${window.location.origin}/auth/callback`
  
  return supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: redirectUrl },
  })
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  })
}

export async function signUpWithEmail(email: string, password: string, options?: { data?: Record<string, unknown>; redirectTo?: string }) {
  return supabase.auth.signUp({
    email,
    password,
    options,
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}
