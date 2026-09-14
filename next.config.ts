import type { NextConfig } from "next";
import productAsset from "./src/data/product-asset.json";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  turbopack: { root: process.cwd() },
  async headers() {
    return [{
      source: productAsset.url,
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }];
  },
  async redirects() {
    return [{ source: "/index.html", destination: "/", permanent: true }];
  },
};

export default nextConfig;
