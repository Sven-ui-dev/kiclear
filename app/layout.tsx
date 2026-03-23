// build: 2026-03-22
import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';

// Fonts werden über globals.css geladen (system-safe fallback)
// next/font/google benötigt Netzwerkzugang beim Build → robustere Lösung
const sora      = { variable: '' };
const spaceMono = { variable: '' };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiclear.ai';

export const metadata: Metadata = {
  title:       'kiclear.ai – EU AI Act Nachweispaket in 25 Sekunden',
  description: 'Vollautomatisiertes EU AI Act Compliance-Paket für KMUs in Deutschland und Österreich. 7–12 rechtssichere Dokumente. Kein Anwalt. Ab €49/Monat.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    title:       'kiclear.ai – EU AI Act Compliance automatisiert',
    description: 'Ihr EU AI Act Nachweispaket in 25 Sekunden – für KMUs in DE und AT.',
    url:         APP_URL,
    siteName:    'kiclear.ai',
    locale:      'de_DE',
    type:        'website',
  },
  robots: { index: true, follow: true },
};

// Globaler Suspense-Fallback für alle Seiten die useSearchParams() nutzen
// (Next.js 14 Requirement: useSearchParams braucht Suspense-Boundary)
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin" />
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="">
      <body className="bg-bg text-white antialiased">
        <Suspense fallback={<LoadingFallback />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
