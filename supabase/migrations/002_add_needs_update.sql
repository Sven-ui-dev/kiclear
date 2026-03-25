-- Migration: add needs_update flag to document_bundles
-- Used by cron/law-monitor and cron/yearly-refresh to flag stale bundles

ALTER TABLE document_bundles
  ADD COLUMN IF NOT EXISTS needs_update BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_bundles_needs_update ON document_bundles(needs_update) WHERE needs_update = TRUE;
