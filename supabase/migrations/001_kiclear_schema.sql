-- ────────────────────────────────────────────────────────────────────────────
-- kiclear.ai – Supabase Database Schema v1.0
-- ────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── profiles (extends Supabase auth.users) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  land         TEXT CHECK (land IN ('DE','AT','CH')) DEFAULT 'DE',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── subscriptions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT UNIQUE NOT NULL,
  stripe_customer_id      TEXT NOT NULL,
  tier                    TEXT CHECK (tier IN ('starter','business','pro','enterprise')) NOT NULL,
  status                  TEXT CHECK (status IN ('active','trialing','past_due','canceled','incomplete')) NOT NULL,
  current_period_start    TIMESTAMPTZ NOT NULL,
  current_period_end      TIMESTAMPTZ NOT NULL,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON subscriptions(status);

-- ── assessments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers                 JSONB NOT NULL DEFAULT '{}',
  score                   INTEGER,
  risk_class              TEXT CHECK (risk_class IN ('MINIMAL','BEGRENZT','HOCHRISIKO','VERBOTEN')),
  grade                   TEXT CHECK (grade IN ('GRUEN','GELB','ROT')),
  score_breakdown         JSONB,
  gaps                    JSONB,
  required_documents      TEXT[],
  completed               BOOLEAN NOT NULL DEFAULT FALSE,
  bundle_version          INTEGER NOT NULL DEFAULT 0,
  imported_from_kicheck   BOOLEAN NOT NULL DEFAULT FALSE,
  kicheck_session_id      TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);

-- ── document_bundles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_bundles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id           UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  version                 INTEGER NOT NULL DEFAULT 1,
  status                  TEXT CHECK (status IN ('pending','generating','ready','error')) NOT NULL DEFAULT 'pending',
  docs_total              INTEGER NOT NULL DEFAULT 0,
  docs_done               INTEGER NOT NULL DEFAULT 0,
  zip_path                TEXT,
  zip_signed_url          TEXT,
  update_reason           TEXT,
  law_reference           TEXT,
  generation_started_at   TIMESTAMPTZ,
  generation_completed_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundles_user_id       ON document_bundles(user_id);
CREATE INDEX IF NOT EXISTS idx_bundles_assessment_id ON document_bundles(assessment_id);

-- ── documents ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  bundle_id     UUID NOT NULL REFERENCES document_bundles(id) ON DELETE CASCADE,
  doc_type      TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  status        TEXT CHECK (status IN ('pending','generating','ready','error')) NOT NULL DEFAULT 'pending',
  content_raw   TEXT,
  storage_path  TEXT,
  pdf_path      TEXT,
  update_reason TEXT,
  law_reference TEXT,
  generated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id    ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_bundle_id  ON documents(bundle_id);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type   ON documents(doc_type);

-- ── law_changes ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS law_changes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source              TEXT NOT NULL,
  title               TEXT NOT NULL,
  summary             TEXT NOT NULL,
  affects_betreiber   BOOLEAN NOT NULL DEFAULT TRUE,
  affects_anbieter    BOOLEAN NOT NULL DEFAULT FALSE,
  affected_doc_types  TEXT[] NOT NULL DEFAULT '{}',
  law_reference       TEXT,
  published_at        TIMESTAMPTZ NOT NULL,
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── transfer_tokens (from kicheck.ai) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfer_tokens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token        UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  answers_json JSONB NOT NULL,
  score        INTEGER NOT NULL,
  risk_class   TEXT NOT NULL,
  email        TEXT,
  target_tier  TEXT DEFAULT 'business',
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  used_at      TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_tokens_token ON transfer_tokens(token);

-- ── Row-Level Security ─────────────────────────────────────────────────────────
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_bundles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_changes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_tokens   ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users see own profile"       ON profiles          FOR ALL USING (id = auth.uid());
CREATE POLICY "Users see own subscriptions" ON subscriptions     FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users see own assessments"   ON assessments       FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users see own bundles"       ON document_bundles  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users see own documents"     ON documents         FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users see law changes"       ON law_changes       FOR SELECT USING (true);
CREATE POLICY "No public token access"      ON transfer_tokens   FOR ALL USING (false);

-- ── Auto-update timestamps ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_assessments_updated_at
  BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Auto-create profile on signup ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Storage Bucket (create in Supabase Dashboard) ─────────────────────────────
-- Name: kiclear-documents
-- Access: Private (nur signed URLs)
-- Structure: {user_id}/{document_id}/{doc_type}_v{version}.md
--            {user_id}/bundles/bundle_v{version}_{bundle_id}.zip
