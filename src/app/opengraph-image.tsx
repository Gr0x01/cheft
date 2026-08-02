import { ImageResponse } from 'next/og';

export const alt = 'Cheft — Find restaurants owned by your favorite TV chefs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#f4efe5',
          color: '#181714',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', fontSize: 42, fontWeight: 700 }}>CHEFT</div>
          <div
            style={{
              display: 'flex',
              padding: '12px 20px',
              border: '2px solid #181714',
              borderRadius: 999,
              fontFamily: 'Arial, sans-serif',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            TV CHEF RESTAURANT GUIDE
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 940 }}>
          <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, lineHeight: 1.04 }}>
            Eat where your favorite TV chefs cook.
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 30,
              fontFamily: 'Arial, sans-serif',
              fontSize: 30,
              lineHeight: 1.35,
              color: '#514d45',
            }}
          >
            Discover restaurants from Top Chef, Iron Chef, Tournament of Champions, and more.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'Arial, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 1,
            color: '#c54b2c',
          }}
        >
          CHEFT.APP
        </div>
      </div>
    ),
    size,
  );
}
