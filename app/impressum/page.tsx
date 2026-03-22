// build: 2026-03-22
import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = { title: 'Impressum – kiclear.ai', robots: { index: false } };
const S = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">{title}</h2>
    <div className="bg-bg-card border border-white/7 rounded-2xl p-6 text-sm text-white/70 leading-relaxed flex flex-col gap-2">{children}</div>
  </section>
);
export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-bg">
      <nav className="border-b border-white/7 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="font-mono text-sm text-white/40 hover:text-white/70 transition-colors">
            ← ki<span className="text-brand-green">clear</span>.ai
          </Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Impressum</h1>
        <p className="text-white/40 text-sm mb-10">Angaben gemäß § 5 TMG</p>
        <S title="Anbieter / Verantwortlicher">
          <p><span className="font-semibold text-white">Tocay Operations UG (haftungsbeschränkt)</span></p>
          <p>Vertreten durch: Sven Grewe (Geschäftsführer)</p>
          <p>c/o Impressumservice Dein-Impressum</p>
          <p>Stettiner Straße 41 · 35410 Hungen · Deutschland</p>
        </S>
        <S title="Kontakt">
          <p>E-Mail: <a href="mailto:hallo@kiclear.ai" className="text-brand-green hover:text-green-300 transition-colors">hallo@kiclear.ai</a></p>
          <p>Datenschutz: <a href="mailto:datenschutz@kiclear.ai" className="text-brand-green hover:text-green-300 transition-colors">datenschutz@kiclear.ai</a></p>
        </S>
        <S title="Handelsregister">
          <p>Registergericht: Amtsgericht [eintragen]</p>
          <p>Registernummer: HRB [eintragen]</p>
        </S>
        <S title="Umsatzsteuer">
          <p>USt-IdNr. gemäß § 27a UStG: [nach Beantragung eintragen]</p>
        </S>
        <S title="Inhaltlich verantwortlich gemäß § 55 Abs. 2 RStV">
          <p>Sven Grewe · Adresse wie oben</p>
        </S>
        <S title="EU-Streitschlichtung">
          <p>Plattform der EU-Kommission: <a href="https://ec.europa.eu/consumers/odr/" className="text-brand-green hover:text-green-300 transition-colors" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr/</a></p>
          <p>Wir nehmen nicht an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teil.</p>
        </S>
        <S title="Haftungsausschluss">
          <p><strong className="text-white/80">Haftung für Inhalte:</strong> Die durch kiclear.ai generierten Compliance-Dokumente ersetzen keine Rechtsberatung. Für verbindliche Rechtssicherheit empfehlen wir die Prüfung durch einen Fachanwalt für IT-Recht.</p>
          <p><strong className="text-white/80">Haftung für Links:</strong> Für Inhalte verlinkter externer Webseiten übernehmen wir keine Gewähr.</p>
          <p><strong className="text-white/80">Urheberrecht:</strong> Die auf dieser Seite erstellten Inhalte unterliegen dem deutschen Urheberrecht. Vervielfältigung bedarf der schriftlichen Zustimmung des Anbieters.</p>
        </S>
        <p className="text-white/20 text-xs font-mono mt-6">Stand: März 2026 · Tocay Operations UG (haftungsbeschränkt)</p>
      </div>
      <footer className="border-t border-white/7 px-6 py-4 mt-4">
        <div className="max-w-3xl mx-auto flex gap-4 text-xs text-white/20 font-mono">
          <Link href="/impressum" className="hover:text-white/50 transition-colors">Impressum</Link>
          <span>·</span>
          <Link href="/datenschutz" className="hover:text-white/50 transition-colors">Datenschutz</Link>
          <span>·</span>
          <Link href="/agb" className="hover:text-white/50 transition-colors">AGB</Link>
        </div>
      </footer>
    </main>
  );
}
