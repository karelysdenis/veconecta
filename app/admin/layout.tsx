import type { ReactNode } from 'react'
import '../globals.css'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 antialiased">{children}</body>
    </html>
  )
}
