// Shared building blocks for the dynamically generated Open Graph images
// (route handlers under /og/*). Images are 1200x630, branded, and always use
// English entity names (satori's built-in font has no Arabic glyphs).

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export const OG_COLORS = {
  background: 'linear-gradient(135deg, #111827 0%, #1f2937 55%, #7c2d12 100%)',
  accent: '#f97316',
  text: '#ffffff',
  muted: '#9ca3af',
};

/**
 * Fetch a remote logo into a data URI so satori never fetches mid-render
 * (a slow/broken logo URL would otherwise fail the whole image).
 * Returns null on any failure — callers render a placeholder instead.
 */
export async function fetchImageDataUri(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? 'image/png';
    const buffer = Buffer.from(await res.arrayBuffer());
    // Refuse anything suspiciously large for an OG asset.
    if (buffer.byteLength > 1_500_000) return null;
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Branded frame: dark gradient, site name on top, content centered. */
export function OgShell({ children, footer }: { children: React.ReactNode; footer?: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundImage: OG_COLORS.background,
        padding: '48px 64px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: 9999,
            backgroundColor: OG_COLORS.accent,
            color: OG_COLORS.text,
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          FM
        </div>
        <div style={{ display: 'flex', color: OG_COLORS.text, fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>
          Football Magic
        </div>
      </div>

      <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {children}
      </div>

      <div style={{ display: 'flex', color: OG_COLORS.muted, fontSize: 26 }}>
        {footer ?? 'football-magic.com'}
      </div>
    </div>
  );
}

/** Team block: logo (or initials placeholder) above the team name. */
export function OgTeam({ name, logo }: { name: string; logo: string | null }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 3)
    .join('')
    .toUpperCase();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: 360 }}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" width={140} height={140} style={{ objectFit: 'contain' }} />
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 140,
            height: 140,
            borderRadius: 9999,
            backgroundColor: 'rgba(255,255,255,0.12)',
            color: OG_COLORS.text,
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          {initials}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          color: OG_COLORS.text,
          fontSize: 40,
          fontWeight: 700,
          textAlign: 'center',
          justifyContent: 'center',
        }}
      >
        {name}
      </div>
    </div>
  );
}
