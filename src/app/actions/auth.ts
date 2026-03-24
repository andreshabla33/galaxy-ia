'use server'

import { signUpWithEmail } from '@/shared/lib/supabase'
import { sendWelcomeEmail } from '@/shared/lib/resend'

export async function signupAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string

  if (!email || !password || !displayName) {
    return { error: 'Missing required fields' }
  }

  try {
    const { data, error: signUpError } = await signUpWithEmail(email, password, {
      data: { display_name: displayName }
    })

    if (signUpError) {
      return { error: signUpError.message }
    }

    // Send welcome email with Resend
    // Note: If you want to use Resend FOR the confirmation email itself,
    // you should configure it in Supabase Console as your SMTP server.
    // This part here sends a custom welcome email.
    if (data.user) {
      await sendWelcomeEmail(email, displayName)
    }

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Error occurred' }
  }
}
