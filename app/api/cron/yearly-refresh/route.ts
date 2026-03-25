// GET /api/cron/yearly-refresh – Jährliche Dokumenten-Auffrischung für alle aktiven Abos
// Aufgerufen von Vercel Cron: jährlich 04:00 UTC am 1. Januar
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const t = Date.now();
  const stats = { flagged: 0, skipped: 0, errors: [] as string[] };

  try {
    // Alle aktiven Business + Pro Abos mit zugehörigem abgeschlossenem Bundle
    const { data: bundles, error } = await supabaseAdmin
      .from('document_bundles')
      .select(`
        id,
        assessment_id,
        assessments!inner(
          id,
          subscriptions!inner(tier, status)
        )
      `)
      .eq('status', 'completed')
      .eq('needs_update', false);

    if (error) throw new Error(`DB-Fehler: ${error.message}`);

    const year = new Date().getFullYear();

    for (const bundle of bundles ?? []) {
      try {
        const sub = (bundle as Record<string, unknown>).assessments as {
          subscriptions: { tier: string; status: string }[];
        };
        const activeSub = sub?.subscriptions?.find(
          s => s.status === 'active' && ['business', 'pro'].includes(s.tier)
        );

        if (!activeSub) {
          stats.skipped++;
          continue;
        }

        await supabaseAdmin
          .from('document_bundles')
          .update({
            needs_update:  true,
            update_reason: `Jährliche Auffrischung ${year} – EU AI Act / DSGVO`,
          })
          .eq('id', (bundle as { id: string }).id);

        stats.flagged++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        stats.errors.push(`bundle ${(bundle as { id: string }).id}: ${msg}`);
        stats.skipped++;
      }
    }

    const ms = Date.now() - t;
    console.log(`[cron/yearly-refresh] Abgeschlossen in ${ms}ms – markiert: ${stats.flagged}, übersprungen: ${stats.skipped}`);

    return Response.json({ ok: true, ms, year, ...stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
    console.error('[cron/yearly-refresh] Fehler:', msg);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
