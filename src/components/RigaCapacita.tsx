'use client';

import type { CaricoGiorno } from '@/lib/capacita/saturazione';
import { formatoBreve, formatoOre, formatoPercentuale } from '@/lib/data/formato';

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
      style={
        {
          height: altezza,
          background: 'var(--sfondo-tenue)',
          borderBottom: '1px solid var(--bordo-forte)',
          '--larghezza-giorno': `${larghezzaGiorno}px`,
        } as React.CSSProperties
      }
      role="img"
      aria-label="Carico giornaliero della risorsa"
    >
      {carico.map((g) => (
        <div
          key={g.giorno}
          className="cella-carico"
          data-fascia={g.fascia}
          style={{ '--pieno': riempimentoDi(g) } as React.CSSProperties}
          title={titoloDi(g)}
        />
      ))}
    </div>
  );
}

/**
 * Altezza del riempimento. L'unica cosa che cambia da cella a cella: colore e
 * forma stanno nelle classi, perche ripeterli in un attributo per ogni cella
 * costava piu del disegno stesso.
 *
 * Oltre il cento per cento la cella si riempie del tutto: un riempimento del
 * centottanta per cento non e rappresentabile e verrebbe letto come cento.
 */
function riempimentoDi(g: CaricoGiorno): string {
  if (g.oreAllocate === 0 || g.percentuale === null) return '0%';
  if (g.fascia === 'SOVRACCARICO') return '100%';
  return `${Math.max(Math.round(g.percentuale), 8)}%`;
}

/**
 * Una riga sola e in forma breve: il suggerimento e ripetuto per ogni cella,
 * quindi ogni parola in piu pesa quanto il numero di celle.
 */
function titoloDi(g: CaricoGiorno): string {
  const giorno = formatoBreve(g.giorno);
  if (g.fascia === 'NON_LAVORATIVO') return `${giorno}: non lavorativo`;
  return `${giorno}: ${formatoOre(g.oreAllocate)} su ${formatoOre(g.oreDisponibili)} (${formatoPercentuale(g.percentuale)})`;
}
