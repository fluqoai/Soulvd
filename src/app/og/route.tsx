import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/**
 * Dynamic Open Graph image — renders a branded 1200×630 card with
 * the Soulvd wordmark, an Arabic tagline, and the sage/linen palette.
 * Used as the default share image site-wide.
 *
 * Reference from metadata: `{ openGraph: { images: ['/og'] } }`
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background:
            'linear-gradient(135deg, #F5F0E4 0%, #E5EBE6 60%, #C9D5CC 100%)',
          fontFamily: 'serif',
          color: '#2C2A26',
        }}
      >
        {/* Top: logo mark + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2C2A26"
            strokeWidth="1.4"
          >
            <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
            <text
              x="12"
              y="16"
              textAnchor="middle"
              fontSize="10"
              fontFamily="serif"
              fontWeight="600"
              fill="#2C2A26"
              stroke="none"
            >
              S
            </text>
          </svg>
          <div
            style={{
              fontSize: 48,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            SOULVD
          </div>
        </div>

        {/* Middle: Arabic tagline + English subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              direction: 'rtl',
            }}
          >
            نحوّل محادثات واتساب إلى مبيعات
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#485A4D',
              fontWeight: 400,
            }}
          >
            Turn WhatsApp conversations into revenue.
          </div>
        </div>

        {/* Bottom: meta */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 20,
            color: '#485A4D',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: '#5F7565',
              }}
            />
            <span>Official Meta WhatsApp Business Partner · 2026</span>
          </div>
          <div style={{ fontWeight: 500 }}>soulvd.sa</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
