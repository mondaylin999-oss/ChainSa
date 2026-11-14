import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Myanmar EarthLens — Understand Myanmar. Discover Change.",
  description: "Explore Myanmar with locally bundled state and region boundaries, NASA observations, interactive charts, and evidence-grounded AI assistance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Same fonts as the EarthLens demo */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Padauk:wght@400;700&family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
