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
  // Next's file tracer drops @swc/helpers' ESM directory from the standalone
  // bundle (only cjs/ is traced), but next@16.2.7's runtime require-hook loads
  // @swc/helpers/esm/*, so the server crashes on boot with MODULE_NOT_FOUND.
  // Copy the full package to guarantee every helper file is present.
  ['node_modules/@swc/helpers', '.next/standalone/node_modules/@swc/helpers'],
];

for (const [from, to] of copies) {
  if (!existsSync(from)) {
    console.warn(`[copy-standalone-assets] SKIP (missing source): ${from}`);
    continue;
  }
  cpSync(from, to, { recursive: true });
  console.log(`[copy-standalone-assets] ${from} -> ${to}`);
}
