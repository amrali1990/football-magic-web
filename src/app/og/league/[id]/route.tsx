import { ImageResponse } from 'next/og';
import { getLeague } from '@/lib/server-api';
import { OG_WIDTH, OG_HEIGHT, OG_COLORS, OgShell, OgTeam, fetchImageDataUri } from '@/lib/og';

export const revalidate = 86400;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leagueId = Number(id);
  // OG images always use English names: satori's bundled font has no Arabic glyphs.
  const league = Number.isInteger(leagueId) && leagueId > 0 ? await getLeague(leagueId, 'en') : null;

  if (!league) {
    return new ImageResponse(<OgShell>{' '}</OgShell>, { width: OG_WIDTH, height: OG_HEIGHT });
  }

  const logo = await fetchImageDataUri(league.logo);

  return new ImageResponse(
    (
      <OgShell footer={league.country?.name || undefined}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <OgTeam name={league.name} logo={logo} />
          <div style={{ display: 'flex', color: OG_COLORS.muted, fontSize: 30 }}>
            Fixtures · Table · Results · Top Scorers
          </div>
        </div>
      </OgShell>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
