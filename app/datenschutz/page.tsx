// build: 2026-03-22
import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = { title: 'Datenschutz – kiclear.ai', robots: { index: false } };

const S = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">{title}</h2>
    <div className="bg-bg-card border border-white/7 rounded-2xl p-6 text-sm text-white/70 leading-relaxed flex flex-col gap-3">{children}</div>
  </section>
);

export default function DatenschutzPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Datenschutzerklärung</h1>
        <p className="text-white/40 text-sm mb-10">Stand: März 2026 · Gemäß DSGVO (EU) 2016/679</p>

        <S title="1. Verantwortlicher (Art. 13 Abs. 1 lit. a DSGVO)">
          <p><span className="font-semibold text-white">Tocay Operations UG (haftungsbeschränkt)</span><br />
          Sven Grewe (Geschäftsführer)<br />
          c/o Impressumservice Dein-Impressum · Stettiner Straße 41 · 35410 Hungen · Deutschland</p>
          <p>E-Mail: <a href="mailto:datenschutz@kiclear.ai" className="text-brand-green hover:text-green-300 transition-colors">datenschutz@kiclear.ai</a></p>
        </S>

        <S title="2. Welche Daten wir verarbeiten">
          <p className="font-semibold text-white/80">2.1 Konto- und Vertragsdaten</p>
          <p>Bei der Registrierung erheben wir E-Mail-Adresse, Passwort (gehashed), optionaler Unternehmensname und Land. Diese Daten sind zur Vertragserfüllung erforderlich (Art. 6 Abs. 1 lit. b DSGVO). Speicherdauer: bis zur Konto-Löschung.</p>
          <hr className="border-white/5" />
          <p className="font-semibold text-white/80">2.2 Assessment-Daten (von kicheck.ai importiert)</p>
          <p>Die Antworten Ihres EU AI Act Assessments werden zur Dokumentengenerierung gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Speicherdauer: bis zur Konto-Löschung oder auf Anfrage.</p>
          <hr className="border-white/5" />
          <p className="font-semibold text-white/80">2.3 Generierte Dokumente</p>
          <p>Die durch Claude (Anthropic) erstellten Compliance-Dokumente werden in Supabase Storage (Frankfurt) gespeichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Speicherdauer: bis zur Konto-Löschung.</p>
          <hr className="border-white/5" />
          <p className="font-semibold text-white/80">2.4 Zahlungsdaten</p>
          <p>Zahlungen werden über Stripe abgewickelt. Stripe speichert Kreditkarten- und SEPA-Daten – kiclear.ai hat keinen Zugriff auf vollständige Zahlungsdaten. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.</p>
          <hr className="border-white/5" />
          <p className="font-semibold text-white/80">2.5 Server-Logs</p>
          <p>IP-Adresse (anonymisiert nach 24h), Zeitstempel, URL, HTTP-Status. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Speicherdauer: 7 Tage.</p>
        </S>

        <S title="3. Auftragsverarbeiter (Art. 28 DSGVO)">
          {[
            { name: 'Vercel Inc.', ort: 'USA (Frankfurt-Region fra1)', zweck: 'Hosting der Webanwendung', basis: 'SCC', url: 'https://vercel.com/legal/privacy-policy' },
            { name: 'Supabase Inc.', ort: 'Singapur (EU-Serverstandort Frankfurt)', zweck: 'Datenbank & Storage', basis: 'EU Frankfurt – kein Drittlandtransfer der Inhaltsdaten', url: 'https://supabase.com/privacy' },
            { name: 'Anthropic PBC', ort: 'USA', zweck: 'KI-Dokumentengenerierung via Claude API', basis: 'SCC · Keine Trainingsdaten aus API-Calls', url: 'https://www.anthropic.com/privacy' },
            { name: 'Stripe Inc.', ort: 'USA', zweck: 'Zahlungsabwicklung (Kreditkarte, SEPA)', basis: 'SCC', url: 'https://stripe.com/de/privacy' },
            { name: 'Resend Inc.', ort: 'USA', zweck: 'Transaktionale E-Mails (Updates, Diff-E-Mail)', basis: 'SCC', url: 'https://resend.com/legal/privacy-policy' },
            { name: 'Cloudflare Inc.', ort: 'USA', zweck: 'DNS, DDoS-Schutz, CDN', basis: 'SCC', url: 'https://www.cloudflare.com/privacypolicy/' },
          ].map(p => (
            <div key={p.name} className="border-l-2 border-brand-green/30 pl-4">
              <p className="font-semibold text-white/80">{p.name}</p>
              <p>{p.ort} · {p.zweck}</p>
              <p className="text-white/40 text-xs">Übertragungsgrundlage: {p.basis}</p>
              <a href={p.url} className="text-brand-green hover:text-green-300 transition-colors text-xs" target="_blank" rel="noopener noreferrer">Datenschutzrichtlinie →</a>
            </div>
          ))}
        </S>

        <S title="4. KI-Verarbeitung (Anthropic Claude)">
          <p>Zur Generierung der Compliance-Dokumente werden die Assessment-Antworten und der Unternehmensname an die Anthropic API übermittelt. <strong className="text-white/80">Anthropic verwendet API-Daten nicht für das Training seiner Modelle</strong> (laut Anthropic API Nutzungsbedingungen).</p>
          <p>Die übermittelten Daten enthalten keine Pflichtangaben zu Personen – lediglich funktionale Unternehmensdaten (Branche, KI-Tools, Governance-Status).</p>
        </S>

        <S title="5. Cookies und Sessions">
          <p>kiclear.ai verwendet ausschließlich technisch notwendige Cookies für die Supabase Auth-Session (HttpOnly, Secure, SameSite=Lax). Es werden keine Tracking- oder Werbe-Cookies eingesetzt. Kein Cookie-Banner erforderlich (§ 25 TTDSG).</p>
        </S>

        <S title="6. Ihre Rechte (Art. 15–22 DSGVO)">
          {['Auskunftsrecht (Art. 15)', 'Recht auf Berichtigung (Art. 16)', 'Recht auf Löschung (Art. 17)', 'Recht auf Einschränkung (Art. 18)', 'Widerspruchsrecht (Art. 21)', 'Datenportabilität (Art. 20)', 'Beschwerderecht (Art. 77)'].map(r => (
            <div key={r} className="flex gap-2"><span className="text-brand-green text-xs mt-1 shrink-0">→</span><span>{r}</span></div>
          ))}
          <p>Anfragen: <a href="mailto:datenschutz@kiclear.ai" className="text-brand-green hover:text-green-300 transition-colors">datenschutz@kiclear.ai</a></p>
          <p><strong className="text-white/80">Aufsichtsbehörde:</strong> LfDI Baden-Württemberg · Königstraße 10a · 70173 Stuttgart · <a href="https://www.baden-wuerttemberg.datenschutz.de" className="text-brand-green hover:text-green-300 transition-colors text-xs" target="_blank" rel="noopener noreferrer">www.baden-wuerttemberg.datenschutz.de</a></p>
        </S>

        <S title="7. Datensicherheit">
          <p>Übertragung ausschließlich per TLS (HTTPS). Passwörter werden durch Supabase Auth gehasht (bcrypt). Dokumente in Supabase Storage sind nur über signierte, zeitlich begrenzte URLs zugänglich. Row-Level-Security in der Datenbank: jeder Nutzer sieht ausschließlich seine eigenen Daten.</p>
        </S>

        <p className="text-white/20 text-xs font-mono mt-4">Stand: März 2026 · Tocay Operations UG (haftungsbeschränkt) · Marbach am Neckar</p>
      </div>
      <footer className="border-t border-white/7 px-6 py-4 mt-4">
        <div className="max-w-3xl mx-auto flex gap-4 text-xs text-white/20 font-mono">
          <Link href="/impressum"    className="hover:text-white/50 transition-colors">Impressum</Link>
          <span>·</span>
          <Link href="/datenschutz" className="hover:text-white/50 transition-colors">Datenschutz</Link>
          <span>·</span>
          <Link href="/agb"         className="hover:text-white/50 transition-colors">AGB</Link>
        </div>
      </footer>
    </main>
  );
}
