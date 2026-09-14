# Verification — 2026-09-14

- `pnpm verify`: ESLint, TypeScript, six behavioral/asset tests, and the optimized Next.js production build.
- Inspected the running site at 375 × 812, 768 × 1024 and 1440 × 960. No document-level horizontal overflow at those widths.
- Visually inspected front and rear model views, partial fuse consumption, the missing fuse at ignition, the full fountain, and reverse scrolling.
- Corrected the mobile fireworks backdrop so it does not cover the copy or main button.
- Browser-tested combined postcode/name search (`8500 Felix`), empty results, reset, expansion to all 37 rows, and the optional Google map. Confirmed the directions target and preserved seasonal note for Frauenfeld.
- Verified click-to-play loads the original video in the privacy-enhanced YouTube embed, with a direct YouTube fallback link.
- Production preview served successfully; `/index.html` returns a 308 redirect to `/`. Generated social image inspected visually.
- Unit tests cover reduced-motion selection, unavailable/blocked WebGL, context/load failure fallback, GPU probe cleanup, reversible animation boundaries, fuse timing, retailer matching and GLB geometry/texture integrity. Reduced motion and GPU failure were tested through the state/probe logic, not by changing the host computer's settings.
- Model binary is approximately 976 KB, including its texture. Mobile fountain uses 2,600 point vertices; the wider scene uses 9,000. No physical-device performance benchmark was run.
- The renderer dependency emits a non-blocking `THREE.Clock` deprecation warning; no application errors were observed in the production scene.
- Local implementation only; no commit, deployment, live retailer validation or exact back-label reproduction is claimed.
