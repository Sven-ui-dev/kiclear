import Link from 'next/link';

const FEATURES = [
  { icon: '⚡', title: '25 Sekunden', desc: 'Vom Assessment zum vollständigen Dokumenten-Bundle – vollautomatisch.' },
  { icon: '📄', title: '7–12 Dokumente', desc: 'KI-Inventar, Policy, Mitarbeiter-Richtlinie, Governance-Struktur und mehr.' },
  { icon: '🔄', title: 'Automatische Updates', desc: 'Bei Gesetzesänderungen werden Ihre Dokumente sofort aktualisiert.' },
  { icon: '🛡️', title: 'DSGVO-nativ', desc: 'Server in Frankfurt. Keine US-Cloud. DSGVO by Design.' },
];

const TIERS = [
  { name: 'Starter', price: '49', target: 'Einmaliges Paket', highlight: false, features: ['7 Dokumente', '1× jährliches Kalender-Update', 'PDF + DOCX', 'E-Mail Support'] },
  { name: 'Business', price: '99', target: 'Mit Gesetzgebungs-Updates', highlight: true,  features: ['7–12 Dokumente', 'Auto-Update bei Gesetzesänderung', 'Diff-E-Mail bei Updates', 'Audit-Trail & Versionsprotokoll', 'Priority Support'] },
  { name: 'Pro', price: '149', target: 'Mit Sofort-Updates', highlight: false,   features: ['Alle Business Features', 'Sofort-Update bei Assessment-Änderung', 'Radiar.ai Integration', 'TokenAudit.ai Integration'] },
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
        <h2 className="text-4xl font-bold text-white text-center mb-4 tracking-tight">
          Der Unterschied liegt im Update
        </h2>
        <p className="text-white/40 text-center mb-4">
          Alle Pläne enthalten das vollständige Dokument-Bundle. Was sich unterscheidet: wie aktuell Ihre Dokumente bleiben.
        </p>
        <p className="text-white/25 text-center text-xs font-mono mb-12">Monatlich kündbar · Keine Einrichtungsgebühren</p>

        {/* Update-Vergleich */}
        <div className="bg-bg-card border border-white/7 rounded-2xl p-5 mb-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-white/40 font-normal pb-3 pr-6">Update-Trigger</th>
                <th className="text-center text-white/60 font-semibold pb-3 px-4">Starter<br/><span className="font-mono text-brand-green text-xs">€49</span></th>
                <th className="text-center text-white font-semibold pb-3 px-4 bg-brand-green/5 rounded-t-lg">Business<br/><span className="font-mono text-brand-green text-xs">€99</span></th>
                <th className="text-center text-white/60 font-semibold pb-3 px-4">Pro<br/><span className="font-mono text-brand-green text-xs">€149</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-3 pr-6 text-white/60">🗓 Jährliches Kalender-Update</td>
                <td className="text-center py-3 px-4 text-brand-green">✓</td>
                <td className="text-center py-3 px-4 text-brand-green bg-brand-green/5">✓</td>
                <td className="text-center py-3 px-4 text-brand-green">✓</td>
              </tr>
              <tr>
                <td className="py-3 pr-6 text-white/60">⚡ Auto-Update bei Gesetzesänderung</td>
                <td className="text-center py-3 px-4 text-white/20">–</td>
                <td className="text-center py-3 px-4 text-brand-green bg-brand-green/5">✓</td>
                <td className="text-center py-3 px-4 text-brand-green">✓</td>
              </tr>
              <tr>
                <td className="py-3 pr-6 text-white/60">🔄 Sofort-Update bei Assessment-Änderung</td>
                <td className="text-center py-3 px-4 text-white/20">–</td>
                <td className="text-center py-3 px-4 text-white/20 bg-brand-green/5">–</td>
                <td className="text-center py-3 px-4 text-brand-green">✓</td>
              </tr>
              <tr>
                <td className="py-3 pr-6 text-white/60">📧 Diff-E-Mail was sich geändert hat</td>
                <td className="text-center py-3 px-4 text-white/20">–</td>
                <td className="text-center py-3 px-4 text-brand-green bg-brand-green/5">✓</td>
                <td className="text-center py-3 px-4 text-brand-green">✓</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tier Cards */}
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
              <p className="text-xs font-mono text-brand-green/70 mb-4">{tier.target}</p>
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
