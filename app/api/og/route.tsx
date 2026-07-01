import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
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
          backgroundColor: '#b91c1c',
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
              color: 'white',
              letterSpacing: '-2px',
            }}
          >
            VEconecta
          </div>
        </div>
        <div
          style={{
            fontSize: '36px',
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.4,
          }}
        >
          Recursos verificados para venezolanos en el exterior
        </div>
        <div
          style={{
            marginTop: '40px',
            fontSize: '24px',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          veconecta.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
