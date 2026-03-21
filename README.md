# kiclear.ai – Boilerplate

> EU AI Act Compliance automatisiert – vollständiges Nachweispaket in 25 Sekunden  
> Tocay Operations UG (haftungsbeschränkt) · Marbach am Neckar · onclear.ai

---

## Stack

| Layer | Technologie |
|---|---|
| Framework | Next.js 14 App Router |
| Sprache | TypeScript (strict) |
| Styling | Tailwind CSS |
| Auth + DB | Supabase (PostgreSQL + RLS) |
| KI-Generierung | Claude API (Anthropic) – claude-sonnet-4 |
| Zahlung | Stripe (SEPA + Kreditkarte) |
| Storage | Supabase Storage (kiclear-documents Bucket) |
| E-Mail | Resend |
| Hosting | Vercel (Region: fra1 – Frankfurt) |
| DNS/CDN | Cloudflare |
| kicheck.ai Integration | Transfer-Token (15-Min-TTL) |

---

## Verzeichnisstruktur

```
kiclear/
├── app/
│   ├── page.tsx                      # Landing Page
│   ├── checkout/page.tsx             # Tier-Auswahl + Stripe Checkout
│   ├── dashboard/page.tsx            # Nutzer-Dashboard
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── generate/route.ts         # POST – Dokumente generieren (Claude API)
│       ├── documents/route.ts        # GET  – Alle Dokumente
│       ├── documents/[id]/route.ts   # GET  – Einzeldokument + Versionen
│       ├── subscription/route.ts     # GET  – Abo-Status
│       ├── subscription/checkout/    # POST – Stripe Checkout starten
│       ├── subscription/portal/      # POST – Stripe Kundenportal
│       ├── webhooks/stripe/route.ts  # POST – Stripe Webhook Handler
│       ├── transfer/[token]/route.ts # GET  – kicheck.ai Transfer-Token
│       ├── law-changes/route.ts      # GET  – Gesetzesänderungen
│       └── health/route.ts           # GET  – Health Check
├── config/
│   ├── documents.ts                  # 12 Dokument-Definitionen + Claude Prompts
│   └── pricing.ts                    # Stripe Tier-Konfiguration (Starter/Business/Pro)
├── lib/
│   ├── classifier.ts                 # Score + Risikoklasse (identisch mit kicheck.ai)
│   ├── generator.ts                  # Claude API Generierungs-Engine
│   ├── storage.ts                    # Supabase Storage (MD, PDF, ZIP)
│   ├── stripe.ts                     # Stripe Helper (Checkout, Portal, Webhook)
│   ├── update-monitor.ts             # Gesetzesänderungs-Monitor
│   ├── supabase.ts                   # Supabase Client
│   └── api-helpers.ts                # Error helpers, Auth guard
├── types/index.ts                    # Alle TypeScript-Typen
├── supabase/migrations/001_kiclear_schema.sql
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── vercel.json                       # Region + Cron Jobs
└── tsconfig.json
```

---

## Setup in 5 Schritten

```bash
# 1. Dependencies
npm install

# 2. Umgebungsvariablen
cp .env.example .env.local
# Alle Werte eintragen

# 3. Supabase Schema
# → SQL Editor: supabase/migrations/001_kiclear_schema.sql ausführen

# 4. Supabase Storage Bucket
# → Dashboard → Storage → New Bucket: "kiclear-documents" (privat)

# 5. Stripe Produkte anlegen
# → Dashboard → Products → 3 Preise erstellen
# → Price IDs in .env.local eintragen

# 6. Dev starten
npm run dev
```

---

## Kern-Features

### Generierungs-Engine (`lib/generator.ts`)
- **Claude claude-sonnet-4** mit 2.000 max_tokens pro Dokument
- **Parallele Generierung** (max 5 gleichzeitig) via `Promise.all`
- **~20–25 Sekunden** Gesamtdauer für ein komplettes Bundle
- **€0,05–0,14** variable Kosten pro Generation (>99,9% Marge auf Business-Abo)

### Dokument-Prompts (`config/documents.ts`)
- **12 Dokument-Typen** vollständig konfiguriert
- **7 Standard + 5 Conditional** (nach Risikoklasse und Triggern)
- Personalisierter **System-Prompt + User-Prompt** per Dokument
- Alle Assessment-Antworten fließen als Kontext ein

### Classifier Engine (`lib/classifier.ts`)
- **Identischer Code** wie kicheck.ai – Score-Konsistenz garantiert
- Risikoklassen: MINIMAL → BEGRENZT → HOCHRISIKO → VERBOTEN
- 28 Antworten → Score 0–100 + priorisierte Gap-Liste

### Stripe Integration (`lib/stripe.ts`)
- Checkout: SEPA Lastschrift + Kreditkarte
- Portal: Self-Service Abo-Verwaltung
- Webhook: Alle relevanten Events verarbeitet

### kicheck.ai Funnel (`app/api/transfer/[token]/route.ts`)
- Transfer-Token aus kicheck.ai → Assessment direkt importiert
- Kein Neustart des Assessments nötig
- 15-Minuten-TTL, Einmalverwendung

### Update-Mechanismus (`lib/update-monitor.ts`)
- Überwacht EUR-Lex, Bundesnetzagentur, BGBL, RTR, BAKOM
- Claude klassifiziert Änderung automatisch
- Tier-basierte Update-Frequenz (Starter: jährlich / Business: bei Gesetz / Pro: sofort)

---

## Verbindung zu kicheck.ai

```
kicheck.ai (kostenlos)    →    kiclear.ai (ab €49/Mo.)
───────────────────────────    ─────────────────────────
28-Fragen-Assessment           Claude API Generierung
Score + Gaps                   7–12 Compliance-Dokumente
PDF-Report                     ZIP-Bundle + Audit-Trail
Transfer-Token →               ← Assessment übernommen
```

---

*Tocay Operations UG (haftungsbeschränkt) · Marbach am Neckar*  
*onclear.ai · kicheck.ai · kiclear.ai*
