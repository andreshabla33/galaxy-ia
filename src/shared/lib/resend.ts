import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY

if (!resendApiKey && process.env.NODE_ENV === 'production') {
  console.warn('RESEND_API_KEY is not defined in environment variables')
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null

export async function sendWelcomeEmail(to: string, name: string) {
  if (!resend) {
    console.error('Resend client is not initialized')
    return { error: 'Resend not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Galaxy AI <onboarding@resend.dev>', // Replace with your domain in production
      to: [to],
      subject: '¡Bienvenido a Galaxy AI Canvas!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #050508; color: #ffffff; border-radius: 12px;">
          <h1 style="color: #3b82f6;">¡Hola ${name}!</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #a1a1aa;">
            Gracias por unirte a Galaxy AI Canvas. Estamos emocionados de tenerte con nosotros.
            Ahora puedes empezar a crear documentos, presentaciones y código con el poder de tu voz.
          </p>
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}" 
               style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
               Ir al Canvas
            </a>
          </div>
          <p style="font-size: 14px; color: #71717a;">
            Si no creaste esta cuenta, puedes ignorar este correo.
          </p>
        </div>
      `,
    })

    return { data, error }
  } catch (error) {
    return { error }
  }
}
