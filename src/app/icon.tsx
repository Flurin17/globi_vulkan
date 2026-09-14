import { ImageResponse } from "next/og";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#163fa2",
        color: "#fbf7ed",
        width: 64,
        height: 64,
        borderRadius: 16,
        fontSize: 55,
        fontWeight: 700,
        paddingBottom: 9,
      }}
    >
      g<span style={{ color: "#f6dc7a" }}>·</span>
    </div>,
    size,
  );
}
