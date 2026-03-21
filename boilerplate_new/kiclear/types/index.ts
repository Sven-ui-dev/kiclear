// ────────────────────────────────────────────────────────────────────────────
// kiclear.ai – Shared TypeScript Types
// ────────────────────────────────────────────────────────────────────────────

// ── Assessment Types ─────────────────────────────────────────────────────────
export type ModuleId = 'A' | 'B' | 'C' | 'D' | 'E';
export type Land = 'DE' | 'AT' | 'CH';
export type RiskClass = 'MINIMAL' | 'BEGRENZT' | 'HOCHRISIKO' | 'VERBOTEN';
export type Grade = 'GRUEN' | 'GELB' | 'ROT';
export type GapSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Gap {
  id: string;
  severity: GapSeverity;
  area: string;
  article: string;
  message: string;
  fix: string;
  document: string;
}

export interface ModuleScore {
  score: number | null;
  max: number;
  label: string;
  percent: number | null;
}

export interface ScoreBreakdown {
  A: ModuleScore; B: ModuleScore; C: ModuleScore; D: ModuleScore; E: ModuleScore;
}

export interface AssessmentAnswers {
  A1?: string; A2?: string; A3?: Land; A4?: string; A5?: string;
  B1?: string[]; B2?: string; B3?: string; B4?: string;
  B5?: string; B6?: string; B7?: string; B8?: string;
  C1?: string; C2?: string; C3?: string; C4?: string; C5?: string; C6?: string;
  D1?: string; D2?: string; D3?: string; D4?: string; D5?: string;
  E1?: string; E2?: string; E3?: string; E4?: string;
}

// ── Subscription Types ────────────────────────────────────────────────────────
export type SubscriptionTier = 'starter' | 'business' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

// ── User / Session ────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  company_name?: string;
  created_at: string;
}

// ── Assessment (kiclear version – authenticated, full) ────────────────────────
export interface Assessment {
  id: string;
  user_id: string;
  answers: Partial<AssessmentAnswers>;
  score: number;
  risk_class: RiskClass;
  grade: Grade;
  score_breakdown: ScoreBreakdown;
  gaps: Gap[];
  required_documents: string[];
  completed: boolean;
  imported_from_kicheck: boolean;
  kicheck_session_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Documents ─────────────────────────────────────────────────────────────────
export type DocumentStatus = 'pending' | 'generating' | 'ready' | 'error';
export type DocumentType =
  | 'DOC_1_INVENTAR'
  | 'DOC_2_POLICY'
  | 'DOC_3_MA_RICHTLINIE'
  | 'DOC_4_TRANSPARENZ'
  | 'DOC_5_VENDOR'
  | 'DOC_6_GOVERNANCE'
  | 'DOC_7_ZUSAMMENFASSUNG'
  | 'DOC_8_RISIKOKLASSIFIZIERUNG'
  | 'DOC_9_GRUNDRECHTE'
  | 'DOC_10_AUFSICHT'
  | 'DOC_11_AVV'
  | 'DOC_12_SCHULUNG';

export interface Document {
  id: string;
  user_id: string;
  assessment_id: string;
  doc_type: DocumentType;
  version: number;
  status: DocumentStatus;
  content_raw: string | null;
  storage_path: string | null;
  pdf_path: string | null;
  update_reason: string | null;
  law_reference: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentBundle {
  id: string;
  user_id: string;
  assessment_id: string;
  version: number;
  documents: Document[];
  zip_path: string | null;
  zip_signed_url: string | null;
  status: 'pending' | 'generating' | 'ready' | 'error';
  generation_started_at: string | null;
  generation_completed_at: string | null;
  update_reason: string | null;
  created_at: string;
}

// ── Generation Job ────────────────────────────────────────────────────────────
export type GenerationJobStatus = 'queued' | 'running' | 'done' | 'error';

export interface GenerationJob {
  id: string;
  user_id: string;
  assessment_id: string;
  bundle_id: string;
  status: GenerationJobStatus;
  progress: number;       // 0–100
  docs_total: number;
  docs_done: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ── Document Prompts ──────────────────────────────────────────────────────────
export interface DocumentPrompt {
  docType:    DocumentType;
  docLabel:   string;
  systemPrompt: string;
  buildUserPrompt: (ctx: GenerationContext) => string;
}

export interface GenerationContext {
  answers:    Partial<AssessmentAnswers>;
  riskClass:  RiskClass;
  score:      number;
  gaps:       Gap[];
  companyName?: string;
  land:       Land;
}

// ── Law Change Monitor ────────────────────────────────────────────────────────
export interface LawChange {
  id: string;
  source: string;
  title: string;
  summary: string;
  affects_betreiber: boolean;
  affects_anbieter: boolean;
  affected_doc_types: DocumentType[];
  law_reference: string;
  published_at: string;
  processed_at: string | null;
  created_at: string;
}

// ── API Responses ─────────────────────────────────────────────────────────────
export interface ApiError {
  error: { code: string; message: string; details?: unknown; request_id?: string };
}

export interface GenerateResponse {
  job_id: string;
  bundle_id: string;
  docs_total: number;
  estimated_seconds: number;
  message: string;
}

export interface GenerateStatusResponse {
  job_id: string;
  status: GenerationJobStatus;
  progress: number;
  docs_done: number;
  docs_total: number;
  bundle?: {
    zip_signed_url: string | null;
    documents: Array<{ id: string; doc_type: DocumentType; status: DocumentStatus }>;
  };
  error_message: string | null;
}
