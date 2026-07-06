import { ImageResponse } from 'next/og';
import { getTeamInfo } from '@/lib/server-api';
import { OG_WIDTH, OG_HEIGHT, OG_COLORS, OgShell, OgTeam, fetchImageDataUri } from '@/lib/og';

export const revalidate = 86400;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teamId = Number(id);
  // OG images always use English names: satori's bundled font has no Arabic glyphs.
  const data = Number.isInteger(teamId) && teamId > 0 ? await getTeamInfo(teamId, 'en') : null;

  if (!data) {
    return new ImageResponse(<OgShell>{' '}</OgShell>, { width: OG_WIDTH, height: OG_HEIGHT });
  }

  const { team } = data;
  const logo = await fetchImageDataUri(team.logo);
  const footer = [team.country?.name, team.venue?.name].filter(Boolean).join(' · ');

  return new ImageResponse(
    (
      <OgShell footer={footer || undefined}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <OgTeam name={team.name} logo={logo} />
          <div style={{ display: 'flex', color: OG_COLORS.muted, fontSize: 30 }}>
            Squad · Fixtures · Results · Stats
          </div>
        </div>
      </OgShell>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
