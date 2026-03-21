// ────────────────────────────────────────────────────────────────────────────
// kiclear.ai – Dokument-Generierungs-Engine (Claude API)
// Core of kiclear.ai – parallel document generation via Claude Sonnet
// ────────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import type { DocumentType, GenerationContext } from '@/types';
import { SYSTEM_PROMPT, buildUserPrompt, DOCUMENT_META } from '@/config/documents';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL           = 'claude-sonnet-4-20250514';
const MAX_TOKENS      = 2000;
const MAX_CONCURRENCY = 5; // Max parallel API calls to avoid rate limits

// ── Result type ───────────────────────────────────────────────────────────────
export interface GeneratedDoc {
  docType:  DocumentType;
  content:  string;
  tokens:   number;
  error?:   string;
}

// ── Generate a single document ────────────────────────────────────────────────
export async function generateDocument(
  docType: DocumentType,
  ctx: GenerationContext
): Promise<GeneratedDoc> {
  try {
    const userPrompt = buildUserPrompt(docType, ctx);

    const message = await anthropic.messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n');

    return {
      docType,
      content,
      tokens: (message.usage.input_tokens ?? 0) + (message.usage.output_tokens ?? 0),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
    console.error(`[Generator] Failed to generate ${docType}:`, msg);
    return { docType, content: '', tokens: 0, error: msg };
  }
}

// ── Generate all documents in parallel (with concurrency limit) ───────────────
export async function generateBundle(
  docTypes: DocumentType[],
  ctx: GenerationContext,
  onProgress?: (done: number, total: number, docType: DocumentType) => void
): Promise<GeneratedDoc[]> {
  const results: GeneratedDoc[] = [];
  let done = 0;

  // Process in batches of MAX_CONCURRENCY
  for (let i = 0; i < docTypes.length; i += MAX_CONCURRENCY) {
    const batch = docTypes.slice(i, i + MAX_CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(docType => generateDocument(docType, ctx))
    );

    for (const result of batchResults) {
      results.push(result);
      done++;
      onProgress?.(done, docTypes.length, result.docType);
    }
  }

  return results;
}

// ── Cost estimation ───────────────────────────────────────────────────────────
export function estimateCost(docCount: number): { eur: number; tokens: number } {
  // ~1000 input + ~2000 output tokens per doc
  const tokensPerDoc = 3000;
  const totalTokens  = docCount * tokensPerDoc;

  // Claude Sonnet pricing (approximate, check current rates)
  const inputPricePerMToken  = 3.0;  // USD per million tokens
  const outputPricePerMToken = 15.0; // USD per million tokens
  const inputCost  = (docCount * 1000 / 1_000_000) * inputPricePerMToken;
  const outputCost = (docCount * 2000 / 1_000_000) * outputPricePerMToken;
  const usd = inputCost + outputCost;
  const eur = usd * 0.92; // approximate EUR conversion

  return { eur: Math.round(eur * 100) / 100, tokens: totalTokens };
}

// ── Content formatting ────────────────────────────────────────────────────────
export function formatDocumentContent(
  docType: DocumentType,
  content: string,
  companyName: string,
  generatedAt: Date
): string {
  const meta = DOCUMENT_META[docType];
  const dateStr = generatedAt.toLocaleDateString('de-DE', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return `# ${meta.label}

**Unternehmen:** ${companyName}
**Erstellt am:** ${dateStr}
**Basierend auf:** EU AI Act (${meta.article})

---

${content}

---

*Dieses Dokument wurde automatisch durch kiclear.ai (Tocay Operations UG) generiert und dient als technisches Hilfsmittel zur Compliance-Unterstützung. Es ersetzt keine individuelle Rechtsberatung. Für verbindliche Rechtssicherheit empfehlen wir die Prüfung durch einen auf KI-Recht spezialisierten Rechtsanwalt.*`;
}
