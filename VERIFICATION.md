# Verification — 2026-09-14

- `pnpm verify`: ESLint, TypeScript, ten behavioral/asset/consent tests, and the optimized Next.js production build.
- Inspected the running site at 375 × 812, 768 × 1024 and 1440 × 960. No document-level horizontal overflow at those widths.
- Visually inspected front and rear model views, partial fuse consumption, the missing fuse at ignition, the full fountain, and reverse scrolling.
- Corrected the mobile fireworks backdrop so it does not cover the copy or main button.
- Browser-tested combined postcode/name search (`8500 Felix`), empty results, reset, expansion to all 37 rows, and the native retailer map. Confirmed the directions target and preserved seasonal note for Frauenfeld.
- Verified click-to-play loads the original video in the privacy-enhanced YouTube embed, with a direct YouTube fallback link.
- Production preview served successfully; `/index.html` returns a 308 redirect to `/`. Generated social image inspected visually.
- Unit tests cover reduced-motion selection, unavailable/blocked WebGL, context/load failure fallback, GPU probe cleanup, reversible animation boundaries, fuse timing, retailer matching and GLB geometry/texture integrity. Reduced motion and GPU failure were tested through the state/probe logic, not by changing the host computer's settings.
- Model binary is approximately 976 KB, including its texture. Mobile fountain uses 2,600 point vertices; the wider scene uses 9,000. No physical-device performance benchmark was run.
- The renderer dependency emits a non-blocking `THREE.Clock` deprecation warning; no application errors were observed in the production scene.
- Local implementation only; no commit, deployment, live retailer validation or exact back-label reproduction is claimed.

## Native retailer map

- Replaced the My Maps iframe with a client-only Leaflet map and local Globi logo markers. All 37 positions are matched to the original public map; source names and coordinates are retained in `src/data/retailer-map-source.json`.
- Browser-verified search synchronisation (`8500 Felix`), empty results, reset, marker details with seasonal note and route link, closing/reopening, keyboard activation of markers and cluster zoom, and resize to 375, 768 and 1440 pixels without horizontal overflow. Confirmed no iframe inside the map and successful OpenStreetMap tile loading.
- `pnpm verify` passed after the map changes: lint, TypeScript, all 10 tests and production build. Two new tests verify coordinate coverage/source matching and filtered locations.
- External tile failure has a visible notice while addresses remain available; an actual provider outage was not simulated. Reduced-motion map animations follow the browser preference; host settings were not changed.

## Reference-based fountain — 2026-09-15

- Downloaded the supplied 1080p reference using `yt-dlp`, then extracted frames with `ffmpeg` at 0:00, every five seconds through 1:00, 1:05 and the final frame at 1:07.8. The video duration is 67.834 seconds. The 15 images and labelled contact sheet are in `artifacts/reference/`; they are local research artifacts, not shipped site assets.
- Replaced repeated point trails with instanced tapered spark ribbons, varying launch directions and velocities, occasional silver clusters/glints, a green-to-gold jet and drifting smoke. The condensed 28-second burn includes five seconds without fresh emission for the residual particles to clear before repeating. Scroll reversal, pause, visibility handling and reduced-motion fallback retain their existing controls.
- Compiled and rendered all three shader pairs (sparks, smoke, jet) directly with native ModernGL on Apple M5, without browser-based capture. Reviewed ignition, growth, full output, burnout and smoke-only frames against the extracted reference at 720 × 780 and 300 × 470. Saved an effect-only 28-second MP4 preview. Adjusted the settled cone scale and drop to keep its base grounded while leaving more headroom above the plume. The native harness translates GLSL declarations to desktop GLSL and uses the scene's camera/source transforms. This checks the effect itself; it does not constitute a browser layout or physical mobile-device benchmark. Preview evidence is in `artifacts/fountain/`.
- `pnpm verify` passes: lint, TypeScript, 22 tests and production build. Three new tests cover the burn/cooling interval, finite/repeating timing and deterministic mobile/desktop particle data including complete crackle groups.
- Local changes only; no commit or deployment.

## Missing sparks correction — 2026-09-15

- Reproduced the reported smoke/jet-only result in the actual local browser page. The spark billboard used a reflected screen-space basis, reversing every triangle's winding; Three.js correctly culled those back faces. Corrected the perpendicular vector to preserve front-facing triangles.
- The previous native preview disabled face culling, so it missed this integration failure. Added `pnpm test:fountain-gpu` using the shipped GLSL, Three.js plane geometry and the actual particle data. Confirmed it fails before the fix with zero lit pixels and passes afterward at 1, 16 and 20 seconds for 720 × 780 and 300 × 470, with culled and unculled renders identical.
- Browser-verified visible gold/silver sparks on the actual page, without shader errors. Saved page screenshots in `artifacts/fountain-check/`. The dependency's existing Clock deprecation warning remains unchanged as requested.
- `pnpm verify` passes (lint, TypeScript, 22 tests, production build), plus all six GPU regression cases.

## Faster fountain rise — 2026-09-15

- Moved the launch-power ramp to 0.3–1.6 seconds, allowing about another 0.9 seconds of particle flight to reach full height. The 28-second cycle and existing colour/burnout timing are preserved.
- Updated timing assertions and added native render checks at 2.5 seconds. Both desktop and mobile reach at least the measured mature plume height by then; all eight GPU cases pass. `pnpm verify` also passes.
