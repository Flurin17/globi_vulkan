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

- `public/assets/globi-vulkan.glb`: standalone model, embedded JPEG wrapper, paper rim, dark opening, curved green fuse and braided thread.
- `public/assets/globi-wrapper.jpg`: complete 360° wrapper texture.
- `public/assets/wrapper-source.png`: source illustration used by the reproducible asset builder.
- `public/assets/product-poster.jpg`: static product poster for loading, reduced motion and WebGL fallback.
- `public/assets/product-reference.jpg`: original reference photograph.

The wrapper is an illustrated reconstruction from one front photograph. The rear and side scenery is artistic, not an exact scan of the retail packaging. The model uses presentation units; its physical dimensions are not verified. The original Globi brand belongs to Orell Füssli AG. Font licence files accompany the locally served fonts.

## Animation

`src/lib/motion.ts` maps bounded scroll progress to a reversible sequence: a complete turn, tip-to-base fuse consumption, Bengal glow, then a growing gold-and-silver fountain. `src/lib/fuse.ts` shares the fuse path and segment counts between the asset builder and viewer. The viewer removes complete tube segments from the outer end, moves an ember along the same path, and removes the entire fuse before the fountain starts. Reversing scroll restores it.

The GLB contains the reusable static model; scroll and particle animation live in `src/components/ProductScene.tsx`. The GPU fountain uses fewer particles on narrow canvases. Rendering pauses when the scene leaves the viewport or the visitor presses pause. Reduced-motion preference, WebGL unavailability, context loss and model-load failures show the poster instead.

## Retailers and external media

All 37 listings from https://www.globi-vulkan.ch/index.html were transcribed on 2026-09-14 into `src/data/retailers.ts`. This includes the four existing website links, duplicate Wil locations and seasonal/location notes. Listings do not imply current stock or opening hours.

Search supports postcode, town, dealer name, multiple terms and common umlaut spellings. Only six rows are initially expanded; all 37 are available using the expansion button or search. Directions open Google Maps. The original My Maps embed loads only when requested and shows all source locations independently of the list filter. The existing YouTube video loads only after pressing play.

## Page rendering

Copy, page structure and metadata use Server Components. Search, media controls and the scroll controller use Client Components; the WebGL bundle is loaded client-side through `next/dynamic`. Fonts and image assets are served locally. `/index.html` permanently redirects to `/`.

No backend, tracking, checkout or live stock API is configured. Canonical metadata targets the original domain. The site has not been published.
