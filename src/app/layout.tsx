import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

// Display face with a little warmth/character (not the generic high-contrast serif),
// paired with a neutral, legible UI face. Loaded via next/font (self-hosted, no CLS).
const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kitchen OS",
  description: "Know what you have, what's about to expire, and what to cook.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Kitchen OS", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#161612" },
  ],
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available — legibility with messy hands beats accidental zoom.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-surface font-sans text-[15px] leading-normal text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
