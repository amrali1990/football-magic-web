// Single source of truth for the Unicode form of every slug and URL path this
// app emits or compares. Arabic text can encode the same visible word in two
// byte forms (precomposed NFC "أ" U+0623 vs decomposed NFD "ا"+"ٔ" U+0627 U+0654);
// browsers, search engines and keyboards produce NFC, so NFC is our canonical
// form. Slug generation (seo.ts), request-path comparison (pathsMatch) and the
// canonicalizing redirect in proxy.ts must all agree on it — always go through
// this helper.
export const normalizeSlug = (s: string): string => s.normalize('NFC');
