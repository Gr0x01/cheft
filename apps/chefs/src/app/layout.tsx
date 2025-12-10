import type { Metadata, Viewport } from "next";
import PlausibleProvider from "next-plausible";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

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
        <link rel="preconnect" href="https://clktrvyieegouggrpfaj.supabase.co" />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="https://upload.wikimedia.org" />
      </head>
      <body className="antialiased">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
