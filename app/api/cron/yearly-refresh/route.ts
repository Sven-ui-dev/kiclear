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
    const year = new Date().getFullYear();

    // Alle user_ids mit aktivem Business/Pro-Abo
    const { data: activeSubs, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .in('tier', ['business', 'pro'])
      .eq('status', 'active');

    if (subError) throw new Error(`DB-Fehler (subscriptions): ${subError.message}`);

    const eligibleUserIds = (activeSubs ?? []).map(s => s.user_id as string);
    if (eligibleUserIds.length === 0) {
      return Response.json({ ok: true, ms: Date.now() - t, year, ...stats });
    }

    // Alle abgeschlossenen Bundles dieser Nutzer die noch kein needs_update haben
    const { data: bundles, error } = await supabaseAdmin
      .from('document_bundles')
      .select('id')
      .in('user_id', eligibleUserIds)
      .eq('status', 'ready')
      .eq('needs_update', false);

    if (error) throw new Error(`DB-Fehler (bundles): ${error.message}`);

    for (const bundle of bundles ?? []) {
      try {
        await supabaseAdmin
          .from('document_bundles')
          .update({
            needs_update:  true,
            update_reason: `Jährliche Auffrischung ${year} – EU AI Act / DSGVO`,
          })
          .eq('id', bundle.id);

        stats.flagged++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        stats.errors.push(`bundle ${bundle.id}: ${msg}`);
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
