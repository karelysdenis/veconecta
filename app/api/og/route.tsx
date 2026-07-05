import { ImageResponse } from 'next/og'
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/locale-content'

export const runtime = 'edge'

const TAGLINE: Record<Locale, string> = {
  es: 'Iniciativas verificadas para que la ayuda llegue a quienes la necesitan',
  en: 'Verified initiatives so help reaches those who need it',
  pt: 'Iniciativas verificadas para que a ajuda chegue a quem precisa',
  fr: "Des initiatives vérifiées pour que l'aide arrive à ceux qui en ont besoin",
  de: 'Verifizierte Initiativen, damit Hilfe die erreicht, die sie brauchen',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const requested = searchParams.get('locale')
  const locale = (LOCALES as readonly string[]).includes(requested ?? '')
    ? (requested as Locale)
    : DEFAULT_LOCALE

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ fontSize: '80px', lineHeight: 1 }}>🇻🇪</div>
          <div
            style={{
              fontSize: '80px',
              fontWeight: 700,
              color: '#141414',
              letterSpacing: '-2px',
            }}
          >
            VEconecta
          </div>
        </div>
        <div
          style={{
            fontSize: '36px',
            color: '#184E68',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.4,
          }}
        >
          {TAGLINE[locale]}
        </div>
        <div
          style={{
            marginTop: '40px',
            fontSize: '24px',
            color: 'rgba(20,20,20,0.5)',
          }}
        >
          veconecta.org
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
