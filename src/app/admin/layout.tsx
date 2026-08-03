import { Metadata } from 'next';

// The login page is a client component and can't export metadata itself, so the
// noindex for every /admin route lives here.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
