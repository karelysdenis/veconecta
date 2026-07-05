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
          La diáspora venezolana conectada
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
