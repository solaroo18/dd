import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Neflix — Auto-Login & TV Activation',
  description: 'Instant Neflix auto-login link and TV activation — no password needed.',
  icons: {
    icon: '/static/img/Netflix.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cairo:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/static/css/style.css?v=2.4" />
      </head>
      <body>{children}</body>
    </html>
  );
}
