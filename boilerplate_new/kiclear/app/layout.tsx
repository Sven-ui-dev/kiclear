import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:       'kiclear.ai – EU AI Act Nachweispaket in 25 Sekunden',
  description: 'Vollautomatisiertes EU AI Act Compliance-Paket für KMUs in Deutschland und Österreich. 7–12 rechtssichere Dokumente. Kein Anwalt. Ab €49/Monat.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiclear.ai'),
  openGraph: {
    title:    'kiclear.ai – EU AI Act Compliance automatisiert',
    description: 'Ihr EU AI Act Nachweispaket in 25 Sekunden – für KMUs in DE und AT.',
    url:      'https://kiclear.ai',
    siteName: 'kiclear.ai',
    locale:   'de_DE',
    type:     'website',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-white antialiased">{children}</body>
    </html>
  );
}
