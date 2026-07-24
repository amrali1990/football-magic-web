// Post-build step for `output: 'standalone'`.
//
// Next's standalone build emits a self-contained server at
// `.next/standalone/server.js`, but it deliberately does NOT copy the static
// assets it serves: `.next/static` (hashed JS/CSS chunks) and `public/`. When
// we run the standalone server directly (as Railway does via the custom start
// command), those paths are resolved relative to the server file, so without
// this copy the page renders but every asset 404s (unstyled, no client JS).
//
// Runs on every `next build` via the "postbuild" npm script. Cross-platform
// (uses Node's fs, not shell `cp`) and idempotent.
import { cpSync, existsSync } from 'node:fs';

const copies = [
  ['.next/static', '.next/standalone/.next/static'],
  ['public', '.next/standalone/public'],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) continue;
  cpSync(from, to, { recursive: true });
  console.log(`[copy-standalone-assets] ${from} -> ${to}`);
}
