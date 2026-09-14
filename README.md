# Globi-Vulkan

German product website built with Next.js 16.3.5 (App Router), React 19.2.8, TypeScript and React Three Fiber. The product model is a self-contained glTF 2.0 binary with an embedded 360° wrapper.

## Run locally

Requires Node.js 22.18+ and pnpm 10.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. For a production preview, run `pnpm build`, then `pnpm start`.

```sh
pnpm verify       # ESLint, TypeScript, behavioral/asset tests, production build
pnpm assets:build # Rebuild the GLB and texture from the saved artwork
```

## Product assets

- `public/assets/globi-vulkan.<content-hash>.glb`: standalone model with embedded artwork, paper normal/roughness maps, a rear overlap seam, folded base, recessed top and green fuse with crossed olive strands. Rebuilds deterministically without external texture downloads.
- `public/assets/globi-wrapper.jpg`: complete 360° wrapper texture.
- `public/assets/wrapper-source.png`: source illustration used by the reproducible asset builder.
- `public/assets/product-poster.jpg`: static product poster for loading, reduced motion and WebGL fallback.
- `public/assets/product-reference.jpg`: original reference photograph.

The wrapper is an illustrated reconstruction from one front photograph. The rear and side scenery is artistic, not an exact scan of the retail packaging. The model uses presentation units; its physical dimensions are not verified. The original Globi brand belongs to Orell Füssli AG. Font licence files accompany the locally served fonts.

## Animation

`src/lib/motion.ts` maps bounded scroll progress to a reversible sequence: a complete turn, tip-to-base fuse consumption, Bengal glow, then a growing gold-and-silver fountain. `src/lib/fuse.ts` shares the fuse path and segment counts between the asset builder and viewer. The viewer removes complete tube segments from the outer end, moves an ember along the same path, and removes the entire fuse before the fountain starts. Reversing scroll restores it.

The GLB contains the reusable static model; scroll and particle animation live in `src/components/ProductScene.tsx`. Studio environment lighting and soft shadows reveal the paper finish. The GPU fountain uses ballistic, cooling spark trails and translucent drifting smoke, with fewer particles on narrow canvases. Static phases render on demand when scroll progress changes. The fuse and fountain request continuous frames only while active; rendering pauses when the scene leaves the viewport, the tab is hidden, or the visitor presses pause. The 3D bundle starts after the poster has painted and the browser is idle; data-saver visitors retain the static poster. Reduced-motion preference, WebGL unavailability, context loss and model-load failures show the poster instead.

## Retailers and external media

All 37 listings from https://www.globi-vulkan.ch/index.html were transcribed on 2026-09-14 into `src/data/retailers.ts`. This includes the four existing website links, duplicate Wil locations and seasonal/location notes. Listings do not imply current stock or opening hours.

Search supports postcode, town, dealer name, multiple terms and common umlaut spellings. Only six rows are initially expanded; all 37 are available using the expansion button or search. Directions open Google Maps. The native Leaflet map loads near the retailer section, filters and reframes with the search, groups nearby locations, and opens retailer details from Globi markers. Map tiles come directly from OpenStreetMap with visible attribution; no map iframe or runtime geocoding is used. The 37 coordinate matches and their original public-map source are recorded in `src/data/retailer-map-source.json`. The additional map-only Unterengstringen location is not added to the website directory. The unchanged Globi logo is served locally at `public/assets/globi-logo.svg`, sourced from https://globi.ch/ (https://orell-fuessli-prod.fra1.cdn.digitaloceanspaces.com/images/globi/Logos/Globi_Logo_mit_Kopf_vektor_umgewandelt.svg). The existing YouTube video loads only after pressing play.

## Page rendering

Copy, page structure and metadata use Server Components. Search, media controls and the scroll controller use Client Components; the WebGL bundle is loaded client-side through `next/dynamic`. Fonts and image assets are served locally. The asset builder records the model URL in `src/data/product-asset.json`; the content-hashed model receives one-year immutable caching. Run `pnpm assets:build` after changing model inputs and deploy the new model and manifest together. `/index.html` permanently redirects to `/`.

No backend, checkout or live stock API is configured. Canonical metadata targets the original domain. The site has not been published.

## Google Analytics and cookie consent

Google Analytics 4 is prepared but disabled by default. Copy `.env.example` to `.env.local` for local use; leave `NEXT_PUBLIC_GA_MEASUREMENT_ID` empty until you have a GA4 web stream. To activate it, set that variable to your real `G-...` measurement ID in the hosting environment and rebuild/redeploy (Next.js embeds public variables at build time).

The German cookie banner matches the site's fonts, colours and buttons. Visitors can accept or decline analytics and reopen their choice using **Cookie-Einstellungen** in the footer. Preferences are stored locally for 180 days and tied to the configured measurement ID, so adding or changing an ID requires a fresh choice. If storage is blocked, the selection applies to the current visit only.

The integration uses [Google's basic consent mode](https://developers.google.com/tag-platform/security/concepts/consent-mode): no Google Analytics script loads before a valid ID and explicit consent. Advertising consent stays denied and Google signals are disabled. Withdrawing consent sets Google's disable flag and removes this site's `_ga` cookies; other open tabs synchronize the stored choice. This consent choice controls Google Analytics only.

Once a real property is configured, accept analytics and check its Realtime report to confirm receipt. No production property or data receipt has been verified as part of this setup.
