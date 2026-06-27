// lib/resend.ts
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendMagicLink(email: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_URL}/api/auth/verify?token=${token}`

  await resend.emails.send({
    from: process.env.RESEND_FROM!,
    to: email,
    subject: 'Tu enlace de acceso a VeConecta',
    html: `
      <p>Hola,</p>
      <p>Haz clic en el enlace para acceder al panel de VeConecta. Válido por 15 minutos.</p>
      <p><a href="${url}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Acceder al panel</a></p>
      <p style="color:#6b7280;font-size:12px;">Si no solicitaste este enlace, ignora este email.</p>
    `,
  })
}
