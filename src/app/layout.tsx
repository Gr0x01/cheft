import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://topchef.fyi';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Cheft | Find restaurants owned by your favorite TV chefs",
  description: "Discover restaurants from Top Chef, Iron Chef, Tournament of Champions winners and contestants. Curated, accurate data about chef restaurants with TV show connections.",
  keywords: ["TV chefs", "Top Chef", "Iron Chef", "restaurants", "chef restaurants", "cooking shows", "Tournament of Champions"],
  authors: [{ name: "Cheft" }],
  robots: "index, follow",
  openGraph: {
    title: "Cheft | Find restaurants owned by your favorite TV chefs",
    description: "Discover restaurants from Top Chef, Iron Chef, Tournament of Champions winners and contestants.",
    type: "website",
    locale: "en_US",
    siteName: "Cheft",
    url: baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Cheft | Find restaurants owned by your favorite TV chefs",
    description: "Discover restaurants from Top Chef, Iron Chef, Tournament of Champions winners and contestants.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
