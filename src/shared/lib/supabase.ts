import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase env vars: define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    return getSupabaseClient()[prop as keyof ReturnType<typeof createClient>]
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

export async function signOut() {
  return supabase.auth.signOut()
}
