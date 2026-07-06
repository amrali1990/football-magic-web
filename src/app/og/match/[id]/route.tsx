import { ImageResponse } from 'next/og';
import { getFixture } from '@/lib/server-api';
import { formatSeoDate } from '@/lib/seo';
import { OG_WIDTH, OG_HEIGHT, OG_COLORS, OgShell, OgTeam, fetchImageDataUri } from '@/lib/og';

// Scores change while a match is live — regenerate the shared image regularly.
export const revalidate = 300;

const FINISHED_OR_LIVE = ['FT', 'AET', 'PEN', '1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  // OG images always use English names: satori's bundled font has no Arabic glyphs.
  const data = Number.isInteger(matchId) && matchId > 0 ? await getFixture(matchId, 'en') : null;

  if (!data) {
    return new ImageResponse(<OgShell>{' '}</OgShell>, { width: OG_WIDTH, height: OG_HEIGHT });
  }

  const { fixture } = data;
  const showScore =
    FINISHED_OR_LIVE.includes(fixture.status?.short ?? '') &&
    fixture.goals.home != null &&
    fixture.goals.away != null;
  const centre = showScore ? `${fixture.goals.home} – ${fixture.goals.away}` : 'VS';
  const footer = [fixture.league?.name, formatSeoDate(fixture.date)].filter(Boolean).join(' · ');

  const [homeLogo, awayLogo] = await Promise.all([
    fetchImageDataUri(fixture.teams.home.logo),
    fetchImageDataUri(fixture.teams.away.logo),
  ]);

  return new ImageResponse(
    (
      <OgShell footer={footer || undefined}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, width: '100%' }}>
          <OgTeam name={fixture.teams.home.name} logo={homeLogo} />
          <div
            style={{
              display: 'flex',
              color: showScore ? OG_COLORS.text : OG_COLORS.muted,
              fontSize: showScore ? 96 : 64,
              fontWeight: 700,
            }}
          >
            {centre}
          </div>
          <OgTeam name={fixture.teams.away.name} logo={awayLogo} />
        </div>
      </OgShell>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
