// ────────────────────────────────────────────────────────────────────────────
// kiclear.ai – Document Storage (Supabase Storage)
// ────────────────────────────────────────────────────────────────────────────

import { supabaseAdmin } from './supabase';
import type { DocumentType } from '@/types';

const BUCKET  = 'kiclear-documents';
const TTL_7D  = 7 * 24 * 60 * 60; // 7 days in seconds
const TTL_30D = 30 * 24 * 60 * 60;

// ── Upload document content as Markdown ───────────────────────────────────────
export async function uploadDocumentMarkdown(
  userId: string,
  documentId: string,
  docType: DocumentType,
  content: string,
  version: number
): Promise<string> {
  const path = `${userId}/${documentId}/${docType}_v${version}.md`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(content, 'utf-8'), {
      contentType: 'text/markdown',
      upsert: true,
    });

  if (error) throw new Error(`Failed to upload document: ${error.message}`);
  return path;
}

// ── Upload PDF ─────────────────────────────────────────────────────────────────
export async function uploadDocumentPdf(
  userId: string,
  documentId: string,
  docType: DocumentType,
  pdfBuffer: Buffer,
  version: number
): Promise<string> {
  const path = `${userId}/${documentId}/${docType}_v${version}.pdf`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) throw new Error(`Failed to upload PDF: ${error.message}`);
  return path;
}

// ── Upload ZIP bundle ──────────────────────────────────────────────────────────
export async function uploadBundle(
  userId: string,
  bundleId: string,
  zipBuffer: Buffer,
  version: number
): Promise<string> {
  const path = `${userId}/bundles/bundle_v${version}_${bundleId}.zip`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, zipBuffer, {
      contentType: 'application/zip',
      upsert: true,
    });

  if (error) throw new Error(`Failed to upload bundle: ${error.message}`);
  return path;
}

// ── Get signed URL ─────────────────────────────────────────────────────────────
export async function getSignedUrl(path: string, ttlSeconds = TTL_7D): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, ttlSeconds);

  if (error || !data?.signedUrl) throw new Error(`Failed to create signed URL: ${error?.message}`);
  return data.signedUrl;
}

// ── Delete user's documents (DSGVO) ───────────────────────────────────────────
export async function deleteUserDocuments(userId: string): Promise<number> {
  const { data: files } = await supabaseAdmin.storage
    .from(BUCKET)
    .list(userId, { limit: 1000 });

  if (!files || files.length === 0) return 0;

  const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
  await supabaseAdmin.storage.from(BUCKET).remove(paths);
  return paths.length;
}
