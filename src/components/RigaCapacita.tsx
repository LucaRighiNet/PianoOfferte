'use client';

import type { CaricoGiorno } from '@/lib/capacita/saturazione';
import { formatoEsteso, formatoOre, formatoPercentuale } from '@/lib/data/formato';
import { giornoSettimanaIso } from '@/lib/data/dataCivile';

const COLORE_FASCIA: Readonly<Record<CaricoGiorno['fascia'], string>> = {
  NON_LAVORATIVO: 'var(--carico-non-lavorativo)',
  SCARICO: 'var(--carico-scarico)',
  SANO: 'var(--carico-sano)',
  PIENO: 'var(--carico-pieno)',
  SOVRACCARICO: 'var(--carico-sovraccarico)',
};

/** Tratteggio per weekend, festivita, ferie e chiusure. */
const TRATTEGGIO_CHIUSO =
  'repeating-linear-gradient(45deg, var(--carico-non-lavorativo) 0 3px, transparent 3px 6px)';

const ETICHETTA_FASCIA: Readonly<Record<CaricoGiorno['fascia'], string>> = {
  NON_LAVORATIVO: 'Non lavorativo',
  SCARICO: 'Spazio disponibile',
  SANO: 'Carico sano',
  PIENO: 'Pieno, nessun margine',
  SOVRACCARICO: 'Sovraccarico',
};

/**
 * Heatmap giornaliera del carico di una persona (M2).
 *
 * Sta dentro una traccia incassata con bordo proprio, perche altrimenti si
 * confonde con una riga di barre: e una scala di riempimento, non un elenco di
 * attivita.
 *
 * L'altezza della barretta e proporzionale alla saturazione fino al 100%.
 * Oltre il 100% la cella si riempie del tutto e cambia colore: un riempimento
 * del 180% non sarebbe rappresentabile e verrebbe letto come 100%.
 */
export function RigaCapacita({
  carico,
  larghezzaGiorno,
  altezza,
}: {
  carico: readonly CaricoGiorno[];
  larghezzaGiorno: number;
  altezza: number;
}) {
  return (
    <div
      className="relative flex"
      style={{
        height: altezza,
        background: 'var(--sfondo-tenue)',
        borderBottom: '1px solid var(--bordo-forte)',
      }}
      role="img"
      aria-label="Carico giornaliero della risorsa"
    >
      {carico.map((g) => {
        const pieno = g.percentuale === null ? 0 : Math.min(100, g.percentuale);
        const sovraccarico = g.fascia === 'SOVRACCARICO';
        const vuoto = g.fascia === 'SCARICO' && g.oreAllocate === 0;
        return (
          <div
            key={g.giorno}
            className="relative"
            style={{
              width: larghezzaGiorno,
              height: '100%',
              borderRight: '1px solid var(--bordo)',
            }}
            title={`${formatoEsteso(g.giorno, giornoSettimanaIso(g.giorno))}
${ETICHETTA_FASCIA[g.fascia]}
Allocato ${formatoOre(g.oreAllocate)} su ${formatoOre(g.oreDisponibili)} (${formatoPercentuale(
              g.percentuale,
            )})`}
          >
            {g.fascia === 'NON_LAVORATIVO' ? (
              // Tratteggio invece di un grigio appena piu scuro: senza contrasto
              // un giorno chiuso e un giorno libero si leggono uguali.
              <div className="absolute inset-0" style={{ background: TRATTEGGIO_CHIUSO }} />
            ) : (
              <>
                {/* Linea di base: rende leggibile la traccia anche dove il
                    carico e zero, cosi "libero" non si confonde con "chiuso". */}
                <div
                  className="absolute right-[1px] bottom-0 left-[1px]"
                  style={{ height: 2, background: 'var(--bordo-forte)', opacity: 0.5 }}
                />
                {vuoto ? null : (
                  <div
                    className="absolute right-[1px] bottom-0 left-[1px]"
                    style={{
                      height: sovraccarico ? '100%' : `${Math.max(pieno, 8)}%`,
                      background: COLORE_FASCIA[g.fascia],
                      borderRadius: '1px 1px 0 0',
                    }}
                  />
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
