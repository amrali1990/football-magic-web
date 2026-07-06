import { ImageResponse } from 'next/og';
import { OG_WIDTH, OG_HEIGHT, OG_COLORS, OgShell } from '@/lib/og';

export const revalidate = 86400;

export async function GET() {
  return new ImageResponse(
    (
      <OgShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', color: OG_COLORS.text, fontSize: 64, fontWeight: 700, textAlign: 'center' }}>
            Live Football Scores
          </div>
          <div style={{ display: 'flex', color: OG_COLORS.muted, fontSize: 34, textAlign: 'center' }}>
            Fixtures · Leagues · Teams · Player Stats
          </div>
        </div>
      </OgShell>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
