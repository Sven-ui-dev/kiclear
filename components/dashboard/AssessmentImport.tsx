'use client';
// build: 2026-03-26

const KICHECK_URL = process.env.NEXT_PUBLIC_KICHECK_URL ?? 'https://kicheck.ai';

export function AssessmentImport({ onImported }: { onImported: () => void }) {
  void onImported; // called automatically via dashboard import_token flow

  return (
    <div className="flex flex-col gap-4">
      <p className="text-white/50 text-sm leading-relaxed">
        Ihr Assessment wurde noch nicht mit diesem Konto verknüpft.
      </p>

      {/* Primary: import from existing kicheck session */}
      <a
        href={`${KICHECK_URL}/check/ergebnis`}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-brand-green text-bg text-sm font-bold px-4 py-3 rounded-xl
          hover:bg-green-300 transition-colors text-center"
      >
        Assessment von kicheck.ai importieren →
      </a>

      <p className="text-white/30 text-xs leading-relaxed">
        Öffnet Ihr kicheck.ai Ergebnis. Klicken Sie dort auf{' '}
        <span className="text-white/50 font-medium">„Bereits Kunde bei kiclear.ai? Assessment direkt importieren"</span>
        {' '}– der Import erfolgt dann automatisch.
      </p>

      <div className="border-t border-white/7 pt-3">
        <p className="text-white/20 text-xs mb-1.5">Noch kein Assessment gemacht?</p>
        <a
          href={`${KICHECK_URL}/check`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          Kostenloser EU AI Act Check auf kicheck.ai →
        </a>
      </div>
    </div>
  );
}
