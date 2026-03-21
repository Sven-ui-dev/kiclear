// ────────────────────────────────────────────────────────────────────────────
// kiclear.ai – Document Definitions & Claude Prompts
// ────────────────────────────────────────────────────────────────────────────

import type { DocumentPrompt, DocumentType, GenerationContext } from '@/types';

// ── System Prompt (shared for all documents) ──────────────────────────────────
export const SYSTEM_PROMPT = `Du bist ein erfahrener deutscher Compliance-Experte für den EU AI Act und DSGVO.

Erstelle ausschließlich rechtssichere, vollständige und direkt verwendbare Compliance-Dokumente für deutsche, österreichische und schweizerische KMUs.

Vorgaben:
- Sprache: Professionelles Deutsch, verständlich und klar, kein reines Juristendeutsch
- Format: Nummerierte Abschnitte, klare Überschriften, direkt verwendbar
- Ton: Professionell, verbindlich, praxisnah
- Länge: 1.500–2.500 Wörter pro Dokument (je nach Typ)
- Artikel-Referenzen: Konkrete EU AI Act Artikel beim ersten Auftreten nennen
- Land-spezifisch: Länderspezifische Besonderheiten (DE/AT) einarbeiten

WICHTIG: 
- Kein Rechtsberatungshinweis im Dokument selbst
- Kein Datum ins Dokument (wird automatisch eingefügt)
- Kein Firmenlogo-Platzhalter
- Dokument mit [DOKUMENTENNAME] als H1 beginnen
- Direkt mit dem Inhalt starten, keine Erklärungen über das Dokument`;

// ── Document Metadata ─────────────────────────────────────────────────────────
export const DOCUMENT_META: Record<DocumentType, { label: string; article: string; pages: string }> = {
  DOC_1_INVENTAR:          { label: 'KI-Inventar',                     article: 'Art. 26',      pages: '1–3 Seiten' },
  DOC_2_POLICY:            { label: 'Unternehmens-KI-Policy',          article: 'Art. 4',       pages: '3–5 Seiten' },
  DOC_3_MA_RICHTLINIE:     { label: 'Mitarbeiter-Nutzungsrichtlinie',  article: 'Art. 4',       pages: '2–3 Seiten' },
  DOC_4_TRANSPARENZ:       { label: 'Transparenz-Hinweis',             article: 'Art. 50',      pages: '1 Seite'    },
  DOC_5_VENDOR:            { label: 'Vendor-Checkliste',               article: 'Art. 26',      pages: '2 Seiten'   },
  DOC_6_GOVERNANCE:        { label: 'Governance-Struktur',             article: 'Art. 26',      pages: '1–2 Seiten' },
  DOC_7_ZUSAMMENFASSUNG:   { label: 'Compliance-Zusammenfassung',      article: '–',            pages: '1 Seite'    },
  DOC_8_RISIKOKLASSIFIZIERUNG: { label: 'Risikoklassifizierungsbericht', article: 'Anhang III', pages: '2–4 Seiten' },
  DOC_9_GRUNDRECHTE:       { label: 'Grundrechte-Folgenabschätzung',   article: 'Art. 27',      pages: '3–5 Seiten' },
  DOC_10_AUFSICHT:         { label: 'Aufsichts-Protokoll-Vorlage',     article: 'Art. 26',      pages: '1–2 Seiten' },
  DOC_11_AVV:              { label: 'AVV-Ergänzungsklausel für KI',    article: 'DSGVO Art. 28', pages: '2–3 Seiten' },
  DOC_12_SCHULUNG:         { label: 'AI Literacy Schulungsnachweis',   article: 'Art. 4',       pages: '1 Seite'    },
};

// ── Standard Documents (always generated) ────────────────────────────────────
export const STANDARD_DOCS: DocumentType[] = [
  'DOC_1_INVENTAR', 'DOC_2_POLICY', 'DOC_3_MA_RICHTLINIE',
  'DOC_4_TRANSPARENZ', 'DOC_5_VENDOR', 'DOC_6_GOVERNANCE', 'DOC_7_ZUSAMMENFASSUNG',
];

// ── Determine which documents to generate ────────────────────────────────────
export function determineRequiredDocuments(ctx: GenerationContext): DocumentType[] {
  const docs: DocumentType[] = [...STANDARD_DOCS];
  const { answers, riskClass, gaps } = ctx;

  // Hochrisiko triggers
  if (riskClass === 'HOCHRISIKO' || riskClass === 'VERBOTEN') {
    docs.push('DOC_8_RISIKOKLASSIFIZIERUNG');
    if (answers.B5 === 'ja') docs.push('DOC_9_GRUNDRECHTE');
    docs.push('DOC_10_AUFSICHT');
  }

  // DSGVO: AVV needed if gap detected
  if (gaps.some(g => g.id === 'G_E4') || (answers.E4 === 'nein' && answers.B5 === 'ja')) {
    docs.push('DOC_11_AVV');
  }

  // Schulungsnachweis if no training
  if (answers.D2 === 'nein') {
    docs.push('DOC_12_SCHULUNG');
  }

  return [...new Set(docs)]; // deduplicate
}

// ── Build user prompt for a specific document ─────────────────────────────────
export function buildUserPrompt(docType: DocumentType, ctx: GenerationContext): string {
  const { answers: a, riskClass, score, gaps, companyName, land } = ctx;

  const kiTools = (a.B1 ?? []).join(', ') || 'keine angegeben';
  const highGaps = gaps.filter(g => g.severity === 'HIGH').map(g => g.message).join('; ') || 'keine';

  const baseCtx = `
Unternehmensprofil:
- Branche: ${a.A1 ?? 'nicht angegeben'}
- Mitarbeiterzahl: ${a.A2 ?? 'nicht angegeben'}
- Land: ${land ?? 'DE'} – bitte länderspezifische Besonderheiten einarbeiten
- Rolle im EU AI Act: ${a.A4 ?? 'Betreiber'}
- Unternehmensname: ${companyName ?? '[Unternehmensname]'}

KI-Einsatz:
- Eingesetzte KI-Tools: ${kiTools}
- Personenbezogene Daten: ${a.B5 ?? 'nicht angegeben'}
- Risikoklasse (automatisch berechnet): ${riskClass}
- Compliance-Score: ${score}/100

Governance-Status (IST):
- KI-Verantwortlicher benannt: ${a.D1 ?? 'nein'}
- Mitarbeiter-Schulungen: ${a.D2 ?? 'nein'}
- Menschliche Aufsicht dokumentiert: ${a.D3 ?? 'nein'}

DSGVO-Status:
- DSB vorhanden: ${a.E1 ?? 'nein'}
- AVV mit KI-Anbietern: ${a.E4 ?? 'nein'}

Kritische Lücken: ${highGaps}`;

  const docPrompts: Record<DocumentType, string> = {
    DOC_1_INVENTAR: `Erstelle ein vollständiges KI-Inventar.

${baseCtx}

Das Dokument soll enthalten:
1. Inventar aller genannten KI-Systeme (${kiTools})
2. Für jedes System: Bezeichnung, Anbieter, Zweck, Risikoklasse, Einsatzbereich
3. Verantwortliche Person (Platzhalter wenn D1=nein)
4. Datum des letzten Reviews
5. Handlungsempfehlungen basierend auf den Lücken`,

    DOC_2_POLICY: `Erstelle eine vollständige Unternehmens-KI-Policy.

${baseCtx}

Das Dokument soll enthalten:
1. Geltungsbereich und Zweck
2. Erlaubte und verbotene KI-Anwendungen
3. Genehmigungsprozess für neue KI-Tools
4. Verantwortlichkeiten (Art. 26)
5. Schulungspflichten (Art. 4)
6. Meldepflichten bei Vorfällen
7. Jährliche Überprüfung
8. Sanktionen bei Verstößen`,

    DOC_3_MA_RICHTLINIE: `Erstelle eine verbindliche Mitarbeiter-Nutzungsrichtlinie für KI-Tools.

${baseCtx}

Das Dokument soll enthalten:
1. Geltungsbereich (alle Mitarbeiter, auch Freelancer)
2. Dos & Don'ts für ${kiTools}
3. Datenschutzregeln bei KI-Nutzung
4. Was NICHT in KI-Tools eingegeben werden darf (personenbezogene Daten, vertrauliche Infos)
5. Meldepflicht bei KI-Fehlern oder unerwarteten Ergebnissen
6. Konsequenzen bei Verstößen
7. Unterschrift und Datum (Platzhalter)`,

    DOC_4_TRANSPARENZ: `Erstelle einen Transparenz-Hinweis für Kunden/Nutzer bei KI-Kundenkontakt (Art. 50 EU AI Act).

${baseCtx}

Das Dokument soll enthalten:
1. Pflichthinweis: "Dieser Dienst nutzt KI-Unterstützung"
2. Welche KI-Systeme eingesetzt werden
3. Was mit den Daten passiert
4. Menschliche Überprüfungsmöglichkeit
5. Kontaktmöglichkeit für Rückfragen
6. Opt-out-Möglichkeit (falls anwendbar)`,

    DOC_5_VENDOR: `Erstelle eine Vendor-Checkliste zur Prüfung der EU AI Act Konformität von KI-Anbietern.

${baseCtx}

Die Checkliste soll folgende Fragen an jeden KI-Anbieter (${kiTools}) enthalten:
1. Risikoklassifizierung des Systems
2. Technische Dokumentation (Anhang IV)
3. CE-Kennzeichnung (falls zutreffend)
4. EU-Datenbank-Registrierung
5. Transparenz-Verpflichtungen
6. Datenschutz / AVV
7. Vorfallmeldepflichten
8. Überprüfbarkeit / Audit-Rechte
Mit Bewertungsraster (konform / teilweise / nicht konform / unklar)`,

    DOC_6_GOVERNANCE: `Erstelle eine Governance-Struktur-Dokumentation für KI-Compliance.

${baseCtx}

Das Dokument soll enthalten:
1. KI-Verantwortliche Person (Platzhalter wenn D1=nein, mit Handlungsempfehlung)
2. Aufgaben und Verantwortlichkeiten
3. Eskalationsprozesse
4. Entscheidungsmatrix: Wer darf welche KI-Systeme genehmigen?
5. Dokumentationspflichten
6. Schnittstellen zu DSGVO-Verantwortlichen
7. Jährliche Governance-Überprüfung`,

    DOC_7_ZUSAMMENFASSUNG: `Erstelle eine Compliance-Zusammenfassung für die Geschäftsführung.

${baseCtx}

Das Dokument soll enthalten:
1. Executive Summary: Compliance-Status (Score: ${score}/100, Klasse: ${riskClass})
2. Die 3 wichtigsten sofortigen Handlungsbedarfe
3. Übersicht: Welche Dokumente wurden erstellt
4. Zeitplan für verbleibende Maßnahmen
5. Haftungshinweis: Dieses Dokument kann bei Behördenprüfungen vorgelegt werden
Maximal 1 Seite, bullet-point-lastig, für GF-Vorlage geeignet`,

    DOC_8_RISIKOKLASSIFIZIERUNG: `Erstelle einen detaillierten Risikoklassifizierungsbericht nach EU AI Act Anhang III.

${baseCtx}

Das Dokument soll enthalten:
1. Klassifizierungsmethodik (basierend auf Anhang III EU AI Act)
2. Analyse der eingesetzten KI-Systeme nach Risikoklassen
3. Begründung der HOCHRISIKO-Einstufung
4. Pflichten aus der Hochrisiko-Klassifizierung
5. Anforderungen an technische Dokumentation (Anhang IV)
6. Zeitplan zur Erfüllung aller Hochrisiko-Pflichten`,

    DOC_9_GRUNDRECHTE: `Erstelle eine Grundrechte-Folgenabschätzung für KI-Systeme mit Personenbezug (Art. 27 EU AI Act).

${baseCtx}

Das Dokument soll enthalten:
1. Betroffene KI-Systeme und verarbeitete Personenkategorien
2. Potenzielle Grundrechtsbeeinträchtigungen (Diskriminierung, Privatsphäre, etc.)
3. Mitigationsmaßnahmen
4. DSGVO-Überschneidungen (DSFA nach Art. 35 DSGVO)
5. Überprüfungsintervalle`,

    DOC_10_AUFSICHT: `Erstelle eine Aufsichts-Protokoll-Vorlage für menschliche Überprüfung von KI-Entscheidungen (Art. 26 EU AI Act).

${baseCtx}

Das Formular soll enthalten:
1. Datum und Uhrzeit der KI-Entscheidung
2. Eingesetztes KI-System
3. KI-Output (Zusammenfassung)
4. Menschliche Überprüfung: Bestätigt / Korrigiert / Abgelehnt
5. Begründung bei Korrektur/Ablehnung
6. Unterschrift der prüfenden Person
Als Formular-Vorlage gestaltet (zum Ausdrucken oder digital ausfüllen)`,

    DOC_11_AVV: `Erstelle eine AVV-Ergänzungsklausel für bestehende Auftragsverarbeitungsverträge mit KI-Anbietern (DSGVO Art. 28 + EU AI Act).

${baseCtx}

Betroffene Anbieter: ${kiTools}

Die Klausel soll enthalten:
1. Definition KI-spezifischer Verarbeitungszwecke
2. KI-spezifische Technisch-Organisatorische Maßnahmen (TOMs)
3. Drittlandtransfer-Regelungen (besonders relevant für US-Anbieter)
4. KI-Vorfallmeldepflichten
5. Audit-Rechte bei KI-Systemen
6. Löschpflichten für KI-Trainingsdaten
Als Ergänzungsklausel zu bestehenden AVVs formuliert`,

    DOC_12_SCHULUNG: `Erstelle eine AI Literacy Schulungsnachweis-Vorlage nach Art. 4 EU AI Act.

${baseCtx}

Das Formular soll enthalten:
1. Schulungstitel und -datum
2. Schulungsinhalt (Checkliste: Was wurde behandelt?)
3. Teilnehmer-Liste mit Unterschriften
4. Bestätigung der schulenden Person
5. Nächster Schulungstermin
Als Formular gestaltet, direkt verwendbar
Plus: Empfohlene Schulungsinhalte als Leitfaden (10 Kernthemen für KI-Kompetenz nach EU AI Act)`,
  };

  return docPrompts[docType] ?? `Erstelle das Dokument: ${DOCUMENT_META[docType]?.label ?? docType}\n\n${baseCtx}`;
}
