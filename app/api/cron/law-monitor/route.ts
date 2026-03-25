// GET /api/cron/law-monitor – Täglich unverarbeitete Gesetzesänderungen klassifizieren
// und betroffene Business/Pro-Nutzer markieren
// Aufgerufen von Vercel Cron: täglich 03:00 UTC
import { NextRequest } from 'next/server';
import {
  getUnprocessedLawChanges,
  markLawChangeProcessed,
  getUsersToUpdate,
  classifyLawChange,
} from '@/lib/update-monitor';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const t = Date.now();
  const stats = { processed: 0, skipped: 0, usersNotified: 0, errors: [] as string[] };

  try {
    const changes = await getUnprocessedLawChanges();
    console.log(`[cron/law-monitor] ${changes.length} unverarbeitete Änderungen gefunden`);

    for (const change of changes) {
      try {
        const classification = await classifyLawChange(change.title, change.summary ?? '');

        // Store classification result back on the law_change record
        await supabaseAdmin
          .from('law_changes')
          .update({
            affects_betreiber:  classification.affectsBetreiber,
            affects_anbieter:   classification.affectsAnbieter,
            affected_doc_types: classification.affectedDocTypes,
          })
          .eq('id', change.id);

        // Find users whose documents need updating
        if (classification.affectedDocTypes.length > 0) {
          const users = await getUsersToUpdate(classification.affectedDocTypes);

          // Flag their document bundles as outdated
          for (const u of users) {
            await supabaseAdmin
              .from('document_bundles')
              .update({ needs_update: true, update_reason: change.title })
              .eq('assessment_id', u.assessmentId)
              .eq('status', 'completed');
          }

          stats.usersNotified += users.length;
        }

        await markLawChangeProcessed(change.id);
        stats.processed++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        stats.errors.push(`change ${change.id}: ${msg}`);
        stats.skipped++;
        console.error(`[cron/law-monitor] Fehler bei Änderung ${change.id}:`, msg);
      }
    }

    const ms = Date.now() - t;
    console.log(`[cron/law-monitor] Abgeschlossen in ${ms}ms – verarbeitet: ${stats.processed}, übersprungen: ${stats.skipped}`);

    return Response.json({ ok: true, ms, ...stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unbekannter Fehler';
    console.error('[cron/law-monitor] Fehler:', msg);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
