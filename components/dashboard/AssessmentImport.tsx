'use client';
// build: 2026-03-23-v36
// AssessmentImport - sauber für Kunden, kein technisches Token-Eingabefeld

export function AssessmentImport({ onImported }: { onImported: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-white/50 text-sm leading-relaxed">
        Ihr Assessment wurde noch nicht mit diesem Konto verknüpft.
      </p>

      {/* Primäre Aktion: neuen Check starten */}
      <a
        href="https://kicheck.ai/check"
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-brand-green text-bg text-sm font-bold px-4 py-3 rounded-xl
          hover:bg-green-300 transition-colors text-center"
      >
        Kostenloser Check auf kicheck.ai →
      </a>

      <p className="text-white/25 text-xs leading-relaxed">
        Nach Abschluss des Checks auf „Nachweispaket generieren" klicken –
        Ihr Assessment wird automatisch übertragen.
      </p>
    </div>
  );
}
