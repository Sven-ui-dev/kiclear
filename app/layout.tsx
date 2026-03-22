import type { Metadata } from 'next';
import { Sora, Space_Mono } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
  display: 'swap',
});

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

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
      <span className="text-white/50">Laden...</span>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sora.variable} ${spaceMono.variable}`}>
      <body className="bg-bg text-white antialiased font-sans">
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
