import type { Metadata, Viewport } from "next";
import { Crimson_Pro, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { PlausibleAnalytics } from "@/components/PlausibleAnalytics";
import { PostHogProvider } from "@/components/PostHogProvider";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Self-hosted at build time. These were loaded by an @import of fonts.googleapis.com at the
// top of globals.css, which serialised three round trips — fetch the CSS, discover the import,
// resolve googleapis, then resolve gstatic — before any text could paint in the right face.
const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-crimson-pro",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheft.app';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Cheft | Find restaurants owned by your favorite TV chefs",
  description: "Discover restaurants from Top Chef, Iron Chef, Tournament of Champions winners and contestants. Curated, accurate data about chef restaurants with TV show connections.",
  keywords: ["TV chefs", "Top Chef", "Iron Chef", "restaurants", "chef restaurants", "cooking shows", "Tournament of Champions"],
  authors: [{ name: "Cheft" }],
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  // noai/noimageai ship as an X-Robots-Tag header from middleware.ts — emitting a second
  // `robots` meta here collided with the structured `robots` field above.
  openGraph: {
    title: "Cheft | Find restaurants owned by your favorite TV chefs",
    description: "Discover restaurants from Top Chef, Iron Chef, Tournament of Champions winners and contestants.",
    type: "website",
    locale: "en_US",
    siteName: "Cheft",
    url: baseUrl,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Cheft — Find restaurants owned by your favorite TV chefs',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cheft | Find restaurants owned by your favorite TV chefs",
    description: "Discover restaurants from Top Chef, Iron Chef, Tournament of Champions winners and contestants.",
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${crimsonPro.variable} ${jetBrainsMono.variable} ${spaceGrotesk.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://clktrvyieegouggrpfaj.supabase.co" />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
      </head>
      <body className="antialiased">
        <PlausibleAnalytics />
        <GoogleAnalytics />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
