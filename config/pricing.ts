// ────────────────────────────────────────────────────────────────────────────
// kiclear.ai – Pricing Configuration
// ────────────────────────────────────────────────────────────────────────────

import type { SubscriptionTier } from '@/types';

export interface TierConfig {
  id:              SubscriptionTier;
  name:            string;
  price:           number; // EUR/month
  priceId:         string; // Stripe price ID (from env)
  targetGroup:     string;
  updateTriggers:  string[];
  features:        string[];
  highlighted:     boolean;
}

export const TIERS: TierConfig[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    priceId: process.env.STRIPE_PRICE_STARTER ?? '',
    targetGroup: 'Bis 10 Mitarbeiter',
    updateTriggers: ['calendar'],
    features: [
      '7 Compliance-Dokumente',
      '1 × jährliches Update',
      'PDF + DOCX Download',
      'Compliance-Score',
      'E-Mail Support',
    ],
    highlighted: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: 99,
    priceId: process.env.STRIPE_PRICE_BUSINESS ?? '',
    targetGroup: '10–50 Mitarbeiter',
    updateTriggers: ['law_change', 'calendar'],
    features: [
      '7–12 Compliance-Dokumente',
      'Update bei Gesetzesänderung',
      '1 × jährliches Update',
      'PDF + DOCX Download',
      'Audit-Trail & Versionsprotokoll',
      'Diff-E-Mail bei Updates',
      'Priority E-Mail Support',
    ],
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    priceId: process.env.STRIPE_PRICE_PRO ?? '',
    targetGroup: '50–250 Mitarbeiter',
    updateTriggers: ['law_change', 'assessment_change', 'calendar'],
    features: [
      '7–12 Compliance-Dokumente',
      'Alle 3 Update-Trigger',
      'Sofort-Update bei Änderung',
      'PDF + DOCX Download',
      'Vollständiger Audit-Trail',
      'Radiar.ai Integration (Rabatt)',
      'TokenAudit.ai Integration (Rabatt)',
      'Priority Support',
    ],
    highlighted: false,
  },
];

export const TIER_MAP = Object.fromEntries(TIERS.map(t => [t.id, t])) as Record<SubscriptionTier, TierConfig>;

export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  const tier = TIERS.find(t => t.priceId === priceId);
  return tier?.id ?? null;
}

export function canUseUpdateTrigger(tier: SubscriptionTier, trigger: string): boolean {
  return TIER_MAP[tier]?.updateTriggers.includes(trigger) ?? false;
}
