import Link from 'next/link';

const FEATURES = [
  { icon: '⚡', title: '25 Sekunden', desc: 'Vom Assessment zum vollständigen Dokumenten-Bundle – vollautomatisch.' },
  { icon: '📄', title: '7–12 Dokumente', desc: 'KI-Inventar, Policy, Mitarbeiter-Richtlinie, Governance-Struktur und mehr.' },
  { icon: '🔄', title: 'Automatische Updates', desc: 'Bei Gesetzesänderungen werden Ihre Dokumente sofort aktualisiert.' },
  { icon: '🛡️', title: 'DSGVO-nativ', desc: 'Server in Frankfurt. Keine US-Cloud. DSGVO by Design.' },
];

const TIERS = [
  { name: 'Starter', price: '49', target: 'Bis 10 Mitarbeiter', highlight: false, features: ['7 Dokumente', '1× jährliches Update', 'PDF + DOCX', 'E-Mail Support'] },
  { name: 'Business', price: '99', target: '10–50 Mitarbeiter', highlight: true,  features: ['7–12 Dokumente', 'Update bei Gesetzesänderung', 'Audit-Trail & Versionsprotokoll', 'Diff-E-Mail bei Updates', 'Priority Support'] },
  { name: 'Pro', price: '149', target: '50–250 Mitarbeiter', highlight: false,   features: ['Alle Business Features', 'Sofort-Update bei Assessment-Änderung', 'Radiar.ai Integration', 'TokenAudit.ai Integration'] },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg bg-grid">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-bg/90 backdrop-blur border-b border-white/7 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-mono font-bold text-white text-lg">
            ki<span className="text-brand-green">clear</span>.ai
          </span>
          <div className="flex items-center gap-4">
            <a href={process.env.NEXT_PUBLIC_KICHECK_URL ?? 'https://kicheck.ai'}
              className="text-sm text-white/50 hover:text-white transition-colors">
              Kostenloser Check →
            </a>
            <Link href="/auth/login"
              className="text-sm font-semibold bg-brand-green text-bg px-4 py-2 rounded-lg hover:bg-green-300 transition-colors">
              Einloggen
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-green/8 border border-brand-green/20
          px-4 py-2 rounded-full text-brand-green font-mono text-xs font-bold
          tracking-widest uppercase mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
          EU AI Act Enforcement: 2. August 2026
        </div>

        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter leading-none mb-6">
          Ihr EU AI Act<br />
          <span className="text-brand-green">Nachweispaket</span><br />
          in 25 Sekunden.
        </h1>

        <p className="text-white/50 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Kein Anwalt. Kein Beratungshonorar. Kein Wartezeit.
          kiclear.ai generiert <strong className="text-white">7–12 rechtssichere Compliance-Dokumente</strong> vollautomatisch aus Ihrem Assessment.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Link href="/checkout"
            className="inline-flex items-center gap-3 bg-brand-green text-bg font-bold text-lg
              px-10 py-5 rounded-2xl hover:bg-green-300 transition-all duration-200
              shadow-xl shadow-brand-green/20 hover:-translate-y-0.5">
            Nachweispaket generieren →
          </Link>
          <a href={process.env.NEXT_PUBLIC_KICHECK_URL ?? 'https://kicheck.ai'}
            className="inline-flex items-center gap-3 border border-white/10 text-white/70 font-semibold text-lg
              px-10 py-5 rounded-2xl hover:border-white/20 hover:text-white transition-all">
            Kostenloser Check zuerst
          </a>
        </div>
        <p className="text-white/30 text-sm">Ab €49/Monat · Monatlich kündbar · SEPA & Kreditkarte</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/5">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-bg-card border border-white/7 rounded-2xl p-6">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-white text-center mb-4 tracking-tight">Einfaches Pricing</h2>
        <p className="text-white/40 text-center mb-12">Monatlich kündbar. Keine Einrichtungsgebühren.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map(tier => (
            <div key={tier.name} className={`rounded-2xl p-6 border flex flex-col ${
              tier.highlight
                ? 'border-brand-green/30 bg-brand-green/5'
                : 'border-white/7 bg-bg-card'
            }`}>
              {tier.highlight && (
                <div className="text-xs font-bold text-brand-green font-mono tracking-widest uppercase mb-4">
                  Beliebteste Wahl
                </div>
              )}
              <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
              <p className="text-white/40 text-sm mb-4">{tier.target}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">€{tier.price}</span>
                <span className="text-white/40 text-sm">/Monat</span>
              </div>
              <ul className="flex flex-col gap-2 mb-8 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                    <span className="text-brand-green text-xs">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href={`/checkout?tier=${tier.name.toLowerCase()}`}
                className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                  tier.highlight
                    ? 'bg-brand-green text-bg hover:bg-green-300'
                    : 'border border-white/10 text-white/70 hover:border-white/20 hover:text-white'
                }`}>
                {tier.name} wählen →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/7 px-6 py-6 text-center">
        <p className="text-white/20 text-xs font-mono">
          kiclear.ai · Tocay Operations UG (haftungsbeschränkt) · Marbach am Neckar ·{' '}
          <a href="https://onclear.ai" className="hover:text-white/40">onclear.ai</a> ·{' '}
          <a href={process.env.NEXT_PUBLIC_KICHECK_URL ?? 'https://kicheck.ai'} className="hover:text-white/40">kicheck.ai</a>
        </p>
      </footer>
    </main>
  );
}
