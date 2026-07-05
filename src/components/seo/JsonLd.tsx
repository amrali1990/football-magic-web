// Server component that injects a JSON-LD structured-data script.
// Deep-cleans null/undefined/empty values so the emitted JSON never contains
// fields Google's Rich Results test would flag, and escapes `<` to prevent
// script-tag injection through API-provided strings.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clean(value: any): any {
  if (Array.isArray(value)) {
    const arr = value.map(clean).filter((v) => v !== undefined);
    return arr.length > 0 ? arr : undefined;
  }
  if (value !== null && typeof value === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = clean(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    // An object reduced to only its @type (or nothing) carries no information.
    const keys = Object.keys(out);
    if (keys.length === 0 || (keys.length === 1 && keys[0] === '@type')) return undefined;
    return out;
  }
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number' && !Number.isFinite(value)) return undefined;
  return value;
}

export function JsonLd({ data }: { data: object }) {
  const cleaned = clean(data);
  if (!cleaned) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleaned).replace(/</g, '\\u003c') }}
    />
  );
}
