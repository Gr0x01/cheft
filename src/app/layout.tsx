import type { Metadata, Viewport } from "next";
import { Inter, Crimson_Pro, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import PlausibleProvider from "next-plausible";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheft.app';

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
        <PlausibleProvider domain="cheft.app" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://clktrvyieegouggrpfaj.supabase.co" />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
      </head>
      <body
        className={`${inter.variable} ${crimsonPro.variable} ${jetBrainsMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
