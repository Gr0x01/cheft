import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://topchef.fyi';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "TV Chef Map | Find restaurants owned by your favorite TV chefs",
  description: "Discover restaurants from Top Chef, Iron Chef, Tournament of Champions winners and contestants. Curated, accurate data about chef restaurants with TV show connections.",
  keywords: ["TV chefs", "Top Chef", "Iron Chef", "restaurants", "chef restaurants", "cooking shows", "Tournament of Champions"],
  authors: [{ name: "TV Chef Map" }],
  robots: "index, follow",
  openGraph: {
    title: "TV Chef Map | Find restaurants owned by your favorite TV chefs",
    description: "Discover restaurants from Top Chef, Iron Chef, Tournament of Champions winners and contestants.",
    type: "website",
    locale: "en_US",
    siteName: "TV Chef Map",
    url: baseUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "TV Chef Map | Find restaurants owned by your favorite TV chefs",
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
      <body
        className={`${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
