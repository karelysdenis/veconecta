import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Source_Sans_3 } from 'next/font/google'
import './globals.css'

export const metadata: Metadata = {
  title: 'VeConecta',
  description: 'Recursos para la diáspora venezolana',
}

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['300', '400', '700', '800'],
  display: 'swap',
})

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source',
  weight: ['300', '400', '600'],
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${jakarta.variable} ${sourceSans.variable}`} suppressHydrationWarning>
      <body className="bg-white text-foreground antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
