// Next.js requires a root layout. The real <html> and <body> live in app/[locale]/layout.tsx
// so that lang={locale} can be set there. This is the standard next-intl escape hatch.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children as any
}
