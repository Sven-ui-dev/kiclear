// build: 2026-03-22
import type { Metadata } from 'next';
import Link from 'next/link';
export const metadata: Metadata = { title: 'AGB – kiclear.ai', robots: { index: false } };

const S = ({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="mb-8 scroll-mt-20">
    <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-4">§ {n} {title}</h2>
    <div className="bg-bg-card border border-white/7 rounded-2xl p-6 text-sm text-white/70 leading-relaxed flex flex-col gap-3">{children}</div>
  </section>
);

export default function AgbPage() {
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
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Allgemeine Geschäftsbedingungen</h1>
        <p className="text-white/40 text-sm mb-10">Stand: März 2026 · Tocay Operations UG (haftungsbeschränkt)</p>

        <S id="geltung" n="1" title="Geltungsbereich">
          <p>Diese AGB regeln die Nutzung des kostenpflichtigen Dienstes <strong className="text-white/80">kiclear.ai</strong>, betrieben von der <strong className="text-white/80">Tocay Operations UG (haftungsbeschränkt)</strong> (nachfolgend „Anbieter"). Mit der Registrierung und dem Abschluss eines Abonnements akzeptiert der Kunde diese AGB.</p>
          <p>Entgegenstehende Bedingungen des Kunden werden nicht anerkannt, es sei denn, der Anbieter hat ihnen schriftlich zugestimmt.</p>
        </S>

        <S id="leistung" n="2" title="Leistungsbeschreibung">
          <p>kiclear.ai generiert automatisch EU AI Act Compliance-Dokumente auf Basis des Assessments aus kicheck.ai oder eines direkt in kiclear.ai erstellten Assessments. Der Dienst umfasst:</p>
          {['7–12 personalisierte Compliance-Dokumente im Markdown/PDF-Format', 'ZIP-Bundle zum Download (7 Tage gültige signed URL)', 'Update-Mechanismus gemäß gewähltem Tarif (Kalender, Gesetz, Assessment)', 'Diff-E-Mail bei Updates (Business und Pro)', 'Audit-Trail mit Versionsprotokoll (Business und Pro)', 'Kundenkonto mit Dashboard und Aboverwaltung'].map(f => (
            <div key={f} className="flex gap-2"><span className="text-brand-green text-xs mt-1 shrink-0">→</span><span>{f}</span></div>
          ))}
          <p className="text-white/40 text-xs mt-2">Die generierten Dokumente ersetzen keine Rechtsberatung. Für verbindliche Rechtssicherheit empfehlen wir die Prüfung durch einen Fachanwalt für IT-Recht.</p>
        </S>

        <S id="vertragsschluss" n="3" title="Vertragsschluss und Abonnement">
          <p>Der Vertrag kommt durch Abschluss des Stripe-Checkouts zustande. Das Abonnement verlängert sich automatisch monatlich, sofern es nicht fristgerecht vor Ablauf des jeweiligen Abrechnungszeitraums gekündigt wird.</p>
          <p>Die Kündigung ist jederzeit zum Ende der laufenden Abrechnungsperiode möglich – über das Dashboard unter „Abo verwalten" (Stripe Kundenportal). Eine Erstattung anteiliger Monatsbeträge erfolgt nicht.</p>
          <p><strong className="text-white/80">Widerrufsrecht:</strong> Verbraucher haben ein 14-tägiges Widerrufsrecht. Durch die sofortige Nutzung des Dienstes (Dokumentengenerierung) erlischt das Widerrufsrecht mit ausdrücklicher Zustimmung des Kunden.</p>
        </S>

        <S id="preise" n="4" title="Preise und Zahlung">
          <p>Die aktuellen Preise sind auf <Link href="/#pricing" className="text-brand-green hover:text-green-300 transition-colors">kiclear.ai</Link> einsehbar. Alle Preise in Euro inkl. MwSt. (sofern anwendbar).</p>
          <p>Zahlungen werden monatlich per Kreditkarte oder SEPA-Lastschrift über Stripe eingezogen. Bei Zahlungsverzug behält sich der Anbieter die Aussetzung des Dienstes vor.</p>
        </S>

        <S id="updates" n="5" title="Update-System">
          <p>Der Anbieter betreibt einen automatischen Update-Monitor. Die Update-Trigger hängen vom gewählten Tarif ab:</p>
          {[
            ['Starter', '1× jährliches Kalender-Update'],
            ['Business', '+ Automatisches Update bei erkannter Gesetzesänderung (EU AI Act, DSGVO)'],
            ['Pro', '+ Sofort-Update bei Änderung des Assessments'],
          ].map(([tier, desc]) => (
            <div key={tier} className="flex gap-2 text-sm"><span className="text-brand-green font-semibold shrink-0 w-20">{tier}</span><span>{desc}</span></div>
          ))}
          <p>Der Anbieter kann keine Garantie für die Vollständigkeit der erkannten Gesetzesänderungen übernehmen. Updates werden nach bestem Bemühen ausgeliefert.</p>
        </S>

        <S id="kein-recht" n="6" title="Kein Rechtsberatungsvertrag">
          <p className="font-semibold text-white/80">kiclear.ai ist kein Rechtsberatungsdienst.</p>
          <p>Die generierten Dokumente stellen ausdrücklich keine Rechtsberatung dar und begründen keinen Rechtsberatungsvertrag. Der Anbieter ist kein Rechtsanwalt im Sinne des BRAO und nicht zur Rechtsberatung gemäß RDG befugt.</p>
          <p>Die Dokumente sind als Arbeitshilfe zu verstehen. Für rechtlich verbindliche Compliance-Aussagen ist die Prüfung durch einen qualifizierten Rechtsanwalt erforderlich.</p>
        </S>

        <S id="nutzungsrechte" n="7" title="Nutzungsrechte">
          <p>Der Kunde erhält ein einfaches, nicht übertragbares Nutzungsrecht an den generierten Dokumenten für den internen Gebrauch im eigenen Unternehmen während der Laufzeit des Abonnements.</p>
          <p>Nach Kündigung dürfen bereits heruntergeladene Dokumente weiter intern genutzt werden. Der Zugriff auf das Dashboard und neue Generierungen endet mit dem Abrechnungszeitraum.</p>
          <p>Eine kommerzielle Weitergabe oder Nutzung der Dokumente als Grundlage für Beratungsleistungen Dritter bedarf der schriftlichen Zustimmung des Anbieters.</p>
        </S>

        <S id="haftung" n="8" title="Haftungsbeschränkung">
          <p>Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für vorsätzlich oder grob fahrlässig verursachte Schäden.</p>
          <p>Im Übrigen ist die Haftung auf den Ersatz des vorhersehbaren, typischerweise eintretenden Schadens beschränkt. Insbesondere haftet der Anbieter nicht für Bußgelder oder Sanktionen nach dem EU AI Act oder der DSGVO die dem Kunden aufgrund unvollständiger oder unrichtiger Compliance entstehen.</p>
          <p>Die Gesamthaftung des Anbieters ist auf den vom Kunden in den letzten 12 Monaten gezahlten Abonnementbetrag begrenzt.</p>
        </S>

        <S id="datenschutz" n="9" title="Datenschutz">
          <p>Die Verarbeitung personenbezogener Daten erfolgt gemäß der <Link href="/datenschutz" className="text-brand-green hover:text-green-300 transition-colors">Datenschutzerklärung</Link>, die Bestandteil dieser AGB ist. Mit Abschluss des Abonnements stimmt der Kunde der Verarbeitung zu den dort beschriebenen Zwecken zu.</p>
        </S>

        <S id="aenderungen" n="10" title="Änderungen der AGB">
          <p>Änderungen werden dem Kunden per E-Mail an die hinterlegte Adresse mit einer Frist von 30 Tagen angekündigt. Widerspricht der Kunde nicht innerhalb dieser Frist, gelten die neuen AGB als akzeptiert. Auf dieses Widerspruchsrecht und die Frist wird in der Ankündigung ausdrücklich hingewiesen.</p>
          <p>Bei Widerspruch hat der Anbieter das Recht, das Abonnement zum Ende der laufenden Periode zu kündigen.</p>
        </S>

        <S id="schluss" n="11" title="Schlussbestimmungen">
          <p><strong className="text-white/80">Anwendbares Recht:</strong> Deutsches Recht unter Ausschluss des UN-Kaufrechts (CISG). Für Verbraucher im EU-Ausland bleiben zwingende Schutzvorschriften des Wohnsitzlandes unberührt.</p>
          <p><strong className="text-white/80">Gerichtsstand:</strong> Für Vollkaufleute und juristische Personen ist der Sitz des Anbieters ausschließlicher Gerichtsstand.</p>
          <p><strong className="text-white/80">Salvatorische Klausel:</strong> Unwirksame Bestimmungen werden durch eine wirksame Regelung ersetzt, die dem wirtschaftlichen Zweck am nächsten kommt.</p>
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
