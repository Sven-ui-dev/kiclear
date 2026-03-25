// ────────────────────────────────────────────────────────────────────────────
// kiclear.ai – Classifier Engine
// IDENTICAL to kicheck.ai/lib/classifier.ts – shared code ensures score
// consistency between free check and paid product.
// ────────────────────────────────────────────────────────────────────────────

import type { AssessmentAnswers, Gap, GapSeverity, Grade, RiskClass, ScoreBreakdown } from '@/types';

// ── Risk Classification ───────────────────────────────────────────────────────
export function classify(answers: Partial<AssessmentAnswers>): ClassificationResult {
  const a = answers;

  // Risk class
  const hochrisikoTriggers: string[] = [];
  if (a.C1 === 'ja') hochrisikoTriggers.push('C1');
  if (a.C2 === 'ja') hochrisikoTriggers.push('C2');
  if (a.C3 === 'ja') hochrisikoTriggers.push('C3');
  if (a.C4 === 'ja') hochrisikoTriggers.push('C4');
  if (a.C5 === 'ja') hochrisikoTriggers.push('C5');

  const isVerboten  = a.C6 === 'ja' && a.A1 === 'oeffentlich';
  const isHochrisiko = hochrisikoTriggers.length > 0 || (a.B6 === 'ja' && (a.A4 === 'anbieter' || a.B7 === 'ja'));
  const isBegrenzt   = a.B5 === 'ja' || a.B3 === 'ja';

  const risk_class: RiskClass = isVerboten ? 'VERBOTEN'
    : isHochrisiko ? 'HOCHRISIKO'
    : isBegrenzt ? 'BEGRENZT'
    : 'MINIMAL';

  // Scores
  const sA = calcA(a), sB = calcB(a), sC = calcC(a), sD = calcD(a), sE = calcE(a);
  const total = sA + sB + sC + sD + sE;

  const score_breakdown: ScoreBreakdown = {
    A: { score: sA, max: 10, label: 'Unternehmenskontext',  percent: Math.round(sA / 10 * 100) },
    B: { score: sB, max: 20, label: 'KI-Inventar',          percent: Math.round(sB / 20 * 100) },
    C: { score: sC, max: 25, label: 'Risikoklassifizierung', percent: Math.round(sC / 25 * 100) },
    D: { score: sD, max: 30, label: 'Governance',           percent: Math.round(sD / 30 * 100) },
    E: { score: sE, max: 15, label: 'DSGVO-Schnittmenge',   percent: Math.round(sE / 15 * 100) },
  };

  const grade: Grade = total >= 80 ? 'GRUEN' : total >= 55 ? 'GELB' : 'ROT';

  const gaps = analyzeGaps(a, risk_class);
  const gaps_summary = {
    high:   gaps.filter(g => g.severity === 'HIGH').length,
    medium: gaps.filter(g => g.severity === 'MEDIUM').length,
    low:    gaps.filter(g => g.severity === 'LOW').length,
  };

  const conditionals: string[] = [];
  if (!a.E4 && a.B5 === 'ja') conditionals.push('DOC_11_AVV');
  if (a.D2 === 'nein')         conditionals.push('DOC_12_SCHULUNG');

  const STANDARD = ['DOC_1_INVENTAR','DOC_2_POLICY','DOC_3_MA_RICHTLINIE','DOC_4_TRANSPARENZ','DOC_5_VENDOR','DOC_6_GOVERNANCE','DOC_7_ZUSAMMENFASSUNG'];
  const HOCHRISIKO_EXTRA = ['DOC_8_RISIKOKLASSIFIZIERUNG','DOC_9_GRUNDRECHTE','DOC_10_AUFSICHT'];

  const required_documents = isHochrisiko
    ? [...STANDARD, ...HOCHRISIKO_EXTRA, ...conditionals]
    : [...STANDARD, ...conditionals];

  return { score: total, grade, risk_class, score_breakdown, gaps, gaps_summary, required_documents, hochrisiko_triggers: hochrisikoTriggers };
}

function calcA(a: Partial<AssessmentAnswers>): number {
  let s = 0;
  if (a.A1) s += 2; if (a.A2) s += 2; if (a.A3) s += 1;
  if (a.A4 && a.A4 !== 'unklar') s += 3;
  if (a.A5 === 'ja') s += 2; else if (a.A5 === 'teilweise') s += 1;
  return Math.min(s, 10);
}
function calcB(a: Partial<AssessmentAnswers>): number {
  let s = 0;
  const b1 = Array.isArray(a.B1) ? a.B1 : (a.B1 ? [a.B1] : []);
  if (b1.length > 0) s += 4;
  if (a.B5 !== undefined) s += 3;
  if (a.B6 === 'nein') s += 5; else if (a.B6 === 'teilweise') s += 2;
  if (a.B8) s += 2;
  if (a.B6 === 'ja') s = Math.max(s - 4, 0);
  return Math.min(s, 20);
}
function calcC(a: Partial<AssessmentAnswers>): number {
  const triggers = ['C1','C2','C3','C4','C5'].filter(k => a[k as keyof AssessmentAnswers] === 'ja');
  return Math.max(25 - triggers.length * 8, 0);
}
function calcD(a: Partial<AssessmentAnswers>): number {
  let s = 0;
  if (a.D1 === 'ja') s += 8;
  if (a.D2 === 'ja') s += 7; else if (a.D2 === 'teilweise') s += 3;
  if (a.D3 === 'ja') s += 7; else if (a.D3 === 'teilweise') s += 3;
  if (a.D4 === 'ja') s += 4;
  if (a.D5 === 'ja') s += 4;
  return Math.min(s, 30);
}
function calcE(a: Partial<AssessmentAnswers>): number {
  let s = 0;
  if (a.E1 === 'ja') s += 4; if (a.E2 === 'ja') s += 4;
  if (a.E3 === 'nein') s += 4;
  if (a.E4 === 'ja') s += 3;
  if (a.E4 === 'nein' && a.B5 === 'ja') s = Math.max(s - 5, 0);
  return Math.min(s, 15);
}

function analyzeGaps(a: Partial<AssessmentAnswers>, riskClass: RiskClass): Gap[] {
  const gaps: Gap[] = [];
  const g = (id: string, severity: GapSeverity, area: string, article: string, message: string, fix: string, document: string) =>
    gaps.push({ id, severity, area, article, message, fix, document });

  if (a.D1 !== 'ja') g('G_D1','HIGH','Governance','Art. 26 EU AI Act','Kein KI-Verantwortlicher benannt.','Benennen Sie eine verantwortliche Person für KI-Governance.','DOC_6_GOVERNANCE');
  if (a.D2 === 'nein') g('G_D2','HIGH','KI-Kompetenz','Art. 4 EU AI Act','Keine nachweisbaren Mitarbeiter-Schulungen.','Führen Sie dokumentierte KI-Schulungen durch.','DOC_12_SCHULUNG');
  if (a.D2 === 'teilweise') g('G_D2b','MEDIUM','KI-Kompetenz','Art. 4 EU AI Act','Schulungen nicht formal dokumentiert.','Erstellen Sie Schulungsnachweise.','DOC_12_SCHULUNG');
  if (a.D3 !== 'ja') g('G_D3','HIGH','Governance','Art. 26 EU AI Act','Kein dokumentierter Prozess für menschliche Aufsicht.','Implementieren Sie Aufsichtsprozesse für KI-Entscheidungen.','DOC_6_GOVERNANCE');
  if (a.D4 !== 'ja') g('G_D4','MEDIUM','Governance','Art. 26 EU AI Act','Keine systematische Dokumentation von KI-Vorfällen.','Führen Sie ein Vorfallsregister ein.','DOC_6_GOVERNANCE');
  if (a.D5 !== 'ja') g('G_D5','MEDIUM','Lieferkette','Art. 26 EU AI Act','KI-Anbieter nicht auf EU AI Act Konformität geprüft.','Prüfen Sie alle KI-Anbieter anhand der Vendor-Checkliste.','DOC_5_VENDOR');
  if (a.A5 !== 'ja') g('G_A5','HIGH','Dokumentation','Art. 4 EU AI Act','Keine interne KI-Policy vorhanden.','Erstellen Sie eine unternehmensweite KI-Richtlinie.','DOC_2_POLICY');
  if (a.B6 === 'ja') g('G_B6','HIGH','Automatisierung','Art. 26 EU AI Act','Vollautomatisierte KI-Entscheidungen ohne menschliche Überprüfung.','Implementieren Sie menschliche Aufsichtspunkte.','DOC_10_AUFSICHT');
  if (a.E4 === 'nein' && a.B5 === 'ja') g('G_E4','HIGH','DSGVO','DSGVO Art. 28','Keine AVV mit KI-Anbietern.','Schließen Sie AVVs mit allen KI-Anbietern ab.','DOC_11_AVV');
  if (a.E3 === 'ja') g('G_E3','MEDIUM','DSGVO','DSGVO Art. 44 ff.','Daten werden in Drittländer übermittelt.','Prüfen Sie SCCs und DSFA für Drittlandtransfers.','DOC_11_AVV');
  if (a.E2 !== 'ja') g('G_E2','MEDIUM','DSGVO','DSGVO Art. 30','KI nicht im VVT dokumentiert.','Aktualisieren Sie Ihr VVT um KI-Verarbeitungen.','DOC_2_POLICY');
  if (riskClass === 'HOCHRISIKO') {
    g('G_HR1','HIGH','Hochrisiko','Art. 9 EU AI Act','Kein Risikomanagementsystem für Hochrisiko-KI.','Implementieren Sie ein vollständiges Risikomanagementsystem.','DOC_8_RISIKOKLASSIFIZIERUNG');
    g('G_HR2','HIGH','Hochrisiko','Art. 13 EU AI Act','Unzureichende Transparenz-Dokumentation.','Erstellen Sie technische Dokumentation nach Anhang IV.','DOC_9_GRUNDRECHTE');
  }

  const order: Record<GapSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return gaps.sort((a, b) => order[a.severity] - order[b.severity]);
}

export interface ClassificationResult {
  score: number; grade: Grade; risk_class: RiskClass;
  score_breakdown: ScoreBreakdown; gaps: Gap[];
  gaps_summary: { high: number; medium: number; low: number };
  required_documents: string[]; hochrisiko_triggers: string[];
}
