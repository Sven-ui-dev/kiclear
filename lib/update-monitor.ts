// ────────────────────────────────────────────────────────────────────────────
// kiclear.ai – Law Change Monitor
// Daily cron job monitors EU AI Act changes and triggers document updates
// ────────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from './supabase';
import type { LawChange, DocumentType } from '@/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Monitoring sources ────────────────────────────────────────────────────────
export const MONITORING_SOURCES = [
  { id: 'eur-lex',           url: 'https://eur-lex.europa.eu/content/news/news.html', land: 'EU', label: 'EUR-Lex' },
  { id: 'ai-office',         url: 'https://digital-strategy.ec.europa.eu/en/policies/european-approach-artificial-intelligence', land: 'EU', label: 'EU AI Office' },
  { id: 'bundesnetzagentur', url: 'https://www.bundesnetzagentur.de/KI', land: 'DE', label: 'Bundesnetzagentur' },
  { id: 'bgbl',              url: 'https://www.bgbl.de', land: 'DE', label: 'Bundesgesetzblatt' },
  { id: 'rtr',               url: 'https://www.rtr.at/TKP/was_wir_tun/gesetze/Gesetze', land: 'AT', label: 'RTR Österreich' },
];

// ── Classify a law change with Claude ────────────────────────────────────────
export async function classifyLawChange(changeTitle: string, changeSummary: string): Promise<{
  affectsBetreiber: boolean;
  affectsAnbieter:  boolean;
  affectedDocTypes: DocumentType[];
  severity:         'minor' | 'major';
}> {
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Analysiere diese EU AI Act / DSGVO Gesetzesänderung und beantworte in JSON:

Titel: ${changeTitle}
Zusammenfassung: ${changeSummary}

Beantworte:
1. Betrifft dies Betreiber (Deployer) von KI-Systemen? (true/false)
2. Betrifft dies Anbieter (Provider) von KI-Systemen? (true/false)
3. Welche der folgenden Dokument-Typen müssen aktualisiert werden?
   DOC_1_INVENTAR, DOC_2_POLICY, DOC_3_MA_RICHTLINIE, DOC_4_TRANSPARENZ,
   DOC_5_VENDOR, DOC_6_GOVERNANCE, DOC_7_ZUSAMMENFASSUNG,
   DOC_8_RISIKOKLASSIFIZIERUNG, DOC_9_GRUNDRECHTE, DOC_10_AUFSICHT,
   DOC_11_AVV, DOC_12_SCHULUNG
4. Schwere: "minor" (leichte Anpassung) oder "major" (wesentliche Änderung)

Antworte NUR in JSON: {"betreiber": bool, "anbieter": bool, "docs": ["DOC_..."], "severity": "minor"|"major"}`,
    }],
  });

  const text = response.content.find(b => b.type === 'text')?.text ?? '{}';
  try {
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return {
      affectsBetreiber: json.betreiber ?? false,
      affectsAnbieter:  json.anbieter ?? false,
      affectedDocTypes: json.docs ?? [],
      severity:         json.severity ?? 'minor',
    };
  } catch {
    return { affectsBetreiber: true, affectsAnbieter: true, affectedDocTypes: [], severity: 'minor' };
  }
}

// ── Store a detected law change ────────────────────────────────────────────────
export async function storeLawChange(change: Omit<LawChange, 'id' | 'processed_at' | 'created_at'>): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('law_changes')
    .insert(change)
    .select('id')
    .single();

  if (error) throw new Error(`Failed to store law change: ${error.message}`);
  return data.id;
}

// ── Get unprocessed law changes ────────────────────────────────────────────────
export async function getUnprocessedLawChanges(): Promise<LawChange[]> {
  const { data } = await supabaseAdmin
    .from('law_changes')
    .select('*')
    .is('processed_at', null)
    .order('published_at', { ascending: true });

  return data ?? [];
}

// ── Mark law change as processed ──────────────────────────────────────────────
export async function markLawChangeProcessed(id: string): Promise<void> {
  await supabaseAdmin
    .from('law_changes')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', id);
}

// ── Get users to update based on tier and affected docs ───────────────────────
export async function getUsersToUpdate(affectedDocTypes: DocumentType[]): Promise<Array<{
  userId: string;
  email: string;
  tier: string;
  assessmentId: string;
}>> {
  // Get all active Business + Pro subscribers (they get law change updates)
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select(`
      user_id,
      tier,
      users!inner(email),
      assessments!inner(id)
    `)
    .in('tier', ['business', 'pro'])
    .eq('status', 'active');

  return (data ?? []).map((row: Record<string, unknown>) => ({
    userId:       row.user_id as string,
    email:        (row.users as { email: string }).email,
    tier:         row.tier as string,
    assessmentId: (row.assessments as { id: string }).id,
  }));
}
