import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Globi-Vulkan – Ein Vulkan. Goldene Momente.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const [font, poster] = await Promise.all([
    readFile(join(process.cwd(), "src/app/fonts/fredoka-social.woff")),
    readFile(join(process.cwd(), "public/assets/product-poster.jpg")),
  ]);
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#fbf7ed",
        color: "#163fa2",
        alignItems: "center",
        padding: "45px 55px",
        fontFamily: "Fredoka",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: "55%" }}>
        <span style={{ fontSize: 24, marginBottom: 32 }}>globi vulkan.</span>
        <span style={{ fontSize: 83, lineHeight: 1.05 }}>Ein Vulkan.</span>
        <span style={{ fontSize: 83, lineHeight: 1.05 }}>Goldene</span>
        <span style={{ fontSize: 83, lineHeight: 1.05, color: "#e44632" }}>
          Momente.
        </span>
        <span style={{ fontSize: 20, marginTop: 30 }}>
          Ein echtes Stück Schweiz.
        </span>
      </div>
      {/* ImageResponse renders this to a PNG, outside the website's image pipeline. */}
      <img
        src={`data:image/jpeg;base64,${poster.toString("base64")}`}
        alt=""
        width={550}
        height={550}
        style={{ objectFit: "contain" }}
      />
    </div>,
    {
      ...size,
      fonts: [{ name: "Fredoka", data: font, weight: 500, style: "normal" }],
    },
  );
}
