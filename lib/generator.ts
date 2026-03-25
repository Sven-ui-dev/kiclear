// build: 2026-03-23-v34
// ────────────────────────────────────────────────────────────────────────────
// kiclear.ai – Dokument-Generierungs-Engine (Claude API)
// Mit Retry-Logik für transiente Anthropic 500-Fehler
// ────────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk';
import type { DocumentType, GenerationContext } from '@/types';
import { SYSTEM_PROMPT, buildUserPrompt, DOCUMENT_META } from '@/config/documents';

// Lazy-Init wie bei Stripe – kein Crash bei fehlendem Key beim Modul-Import
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY ist nicht konfiguriert.');
    _anthropic = new Anthropic({ apiKey: key });
  }
  return _anthropic;
}

const MODEL           = 'claude-sonnet-4-20250514';
const MAX_TOKENS      = 4096;
const MAX_CONCURRENCY = 12; // Alle Docs parallel – kürzer als serielle Batches

// ── Result type ───────────────────────────────────────────────────────────────
export interface GeneratedDoc {
  docType:  DocumentType;
  content:  string;
  tokens:   number;
  error?:   string;
}

// ── Retry-Helper für transiente API-Fehler ────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message;

      // Nur bei transienten Fehlern retrien (5xx, overloaded, timeout)
      const isTransient =
        msg.includes('500') ||
        msg.includes('529') ||
        msg.includes('overloaded') ||
        msg.includes('api_error') ||
        msg.includes('timeout') ||
        msg.includes('unknown error');

      if (!isTransient || attempt === maxAttempts) {
        throw lastError;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1); // exponential backoff
      console.log(`[Generator] Attempt ${attempt} failed (${msg.slice(0, 60)}), retry in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError ?? new Error('Max retries exceeded');
}

// ── Generate a single document (with retry) ───────────────────────────────────
export async function generateDocument(
  docType: DocumentType,
  ctx: GenerationContext
): Promise<GeneratedDoc> {
  try {
    const userPrompt = buildUserPrompt(docType, ctx);

    const message = await withRetry(() =>
      getAnthropic().messages.create({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        system:     SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      })
    );

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
    console.error(`[Generator] Failed after retries ${docType}:`, msg);
    return { docType, content: '', tokens: 0, error: msg };
  }
}

// ── Generate all documents with concurrency limit ────────────────────────────
export async function generateBundle(
  docTypes: DocumentType[],
  ctx: GenerationContext,
  onProgress?: (done: number, total: number, docType: DocumentType) => void
): Promise<GeneratedDoc[]> {
  const results: GeneratedDoc[] = [];
  let done = 0;

  // Batches mit reduzierter Concurrency (3 statt 5)
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

    // Keine Pause – MAX_CONCURRENCY 12 bedeutet alle Docs in einem Batch
  }

  return results;
}

// ── Cost estimation ───────────────────────────────────────────────────────────
export function estimateCost(docCount: number): { eur: number; tokens: number } {
  const tokensPerDoc = 3000;
  const totalTokens  = docCount * tokensPerDoc;
  const inputCost    = (docCount * 1000 / 1_000_000) * 3.0;
  const outputCost   = (docCount * 2000 / 1_000_000) * 15.0;
  const eur          = (inputCost + outputCost) * 0.92;
  return { eur: Math.round(eur * 100) / 100, tokens: totalTokens };
}

// ── Content formatting ────────────────────────────────────────────────────────
export function formatDocumentContent(
  docType: DocumentType,
  content: string,
  companyName: string,
  generatedAt: Date
): string {
  const meta    = DOCUMENT_META[docType];
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
