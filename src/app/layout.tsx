import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const display = localFont({
  src: "./fonts/fredoka.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "300 700",
});
const body = localFont({
  src: "./fonts/dm-sans.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "100 1000",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.globi-vulkan.ch"),
  title: "Globi-Vulkan – Ein Vulkan. Goldene Momente.",
  description:
    "Der Globi-Vulkan aus der Schweiz: helles Bengalfeuer, eine goldene Fontäne und Silberfunken. Entdecke Globi in 360° und finde deine Verkaufsstelle.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Globi-Vulkan – Goldene Momente.",
    description:
      "Unser Globi. Ein Schweizer Original. Entdecke den Globi-Vulkan und finde eine Verkaufsstelle in deiner Nähe.",
    url: "https://www.globi-vulkan.ch",
    siteName: "Globi-Vulkan",
    locale: "de_CH",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Globi-Vulkan – Ein Vulkan. Goldene Momente.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { themeColor: "#fbf7ed" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de-CH" className={`${display.variable} ${body.variable}`}>
      <body>
        <a href="#hauptinhalt" className="skip-link">
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
