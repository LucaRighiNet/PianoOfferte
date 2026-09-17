'use client';

import { memo } from 'react';
import type { Collocazione } from '@/lib/timeline/geometria';
import type { Semaforo, StatoVisualizzato } from '@/lib/offerta/rischio';
import { ETICHETTE_SEMAFORO, ETICHETTE_STATO } from '@/lib/offerta/rischio';
import { formatoBreve, formatoOre } from '@/lib/data/formato';
import type { DataCivile } from '@/lib/data/dataCivile';

/**
 * Barra di una attivita sulla timeline.
 *
 * Scelta cromatica: il riempimento codifica il TIPO di attivita, non l'identita
 * dell'offerta. Con 30-100 offerte al mese (par. 1.2 del piano) un colore per
 * offerta produce decine di tinte simultanee che non si possono decodificare a
 * occhio. I tipi di attivita sono cinque e restano leggibili. L'identita
 * dell'offerta resta nel filetto laterale, nel tooltip e nel dettaglio.
 */

export interface DatiBarra {
  readonly id: string;
  readonly etichetta: string;
  readonly offertaCodice: string;
  readonly offertaDescrizione: string;
  readonly cliente: string;
  readonly persona: string | null;
  /** Colore del tipo di attivita: e il riempimento. */
  readonly coloreTipo: string;
  /** Colore dell'offerta: e solo il filetto di sinistra. */
  readonly coloreOfferta: string;
  readonly stato: StatoVisualizzato;
  readonly semaforo: Semaforo;
  readonly scadenza: DataCivile | null;
  readonly stimaOre: number;
  readonly dataInizio: DataCivile;
  readonly dataFine: DataCivile;
  /** Colonne interne alla barra in cui la persona non lavora. */
  readonly giorniNonLavorativi: readonly number[];
}

const TRATTEGGIO =
  'repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0 3px, rgba(255,255,255,0) 3px 6px)';

/** Il bordo sinistro della barra rispetto al bordo della griglia. */
const SCOSTAMENTO_BARRA = 1;

function bordoDi(stato: StatoVisualizzato): string {
  if (stato === 'IN_RITARDO') return '1.5px solid var(--semaforo-rosso)';
  if (stato === 'BLOCCATA') return '1.5px dashed var(--semaforo-ambra)';
  if (stato === 'NON_INIZIATA') return '1px dashed rgba(0,0,0,0.28)';
  return '1px solid rgba(0,0,0,0.14)';
}

function opacitaDi(stato: StatoVisualizzato): number {
  if (stato === 'COMPLETATA') return 0.38;
  if (stato === 'NON_INIZIATA') return 0.68;
  return 1;
}

export const BarraAttivita = memo(function BarraAttivita({
  dati,
  collocazione,
  larghezzaGiorno,
  altezza,
  alto,
  selezionata,
  onSeleziona,
}: {
  dati: DatiBarra;
  collocazione: Collocazione;
  larghezzaGiorno: number;
  altezza: number;
  /** Distanza dal bordo superiore della zona corsie, in pixel. */
  alto: number;
  selezionata: boolean;
  onSeleziona: (id: string) => void;
}) {
  const aRischio = dati.semaforo === 'ROSSO' || dati.semaforo === 'SFORATA';

  const titolo = [
    `${dati.offertaDescrizione} — ${dati.cliente}`,
    `${dati.etichetta} · ${formatoOre(dati.stimaOre)}`,
    dati.persona ?? 'Non assegnata',
    `${formatoBreve(dati.dataInizio)} — ${formatoBreve(dati.dataFine)}`,
    `Stato: ${ETICHETTE_STATO[dati.stato]}`,
    dati.scadenza
      ? `Scadenza cliente: ${formatoBreve(dati.scadenza)} (${ETICHETTE_SEMAFORO[dati.semaforo]})`
      : 'Senza scadenza cliente',
    dati.offertaCodice,
  ].join('\n');

  const larghezza = Math.max(larghezzaGiorno - 2, collocazione.larghezza - 2);

  return (
    <button
      type="button"
      onClick={() => onSeleziona(dati.id)}
      title={titolo}
      aria-label={titolo.replace(/\n/g, '. ')}
      className="absolute flex items-center overflow-hidden rounded-[4px] text-left text-[11px] leading-none outline-none focus-visible:ring-2"
      style={{
        left: collocazione.sinistra + SCOSTAMENTO_BARRA,
        top: alto,
        width: larghezza,
        height: altezza,
        background: dati.coloreTipo,
        opacity: opacitaDi(dati.stato),
        color: '#fff',
        border: bordoDi(dati.stato),
        boxShadow: selezionata ? '0 0 0 2px var(--oggi)' : 'none',
        borderTopLeftRadius: collocazione.tagliataInizio ? 0 : 4,
        borderBottomLeftRadius: collocazione.tagliataInizio ? 0 : 4,
        borderTopRightRadius: collocazione.tagliataFine ? 0 : 4,
        borderBottomRightRadius: collocazione.tagliataFine ? 0 : 4,
        paddingLeft: collocazione.tagliataInizio ? 4 : 7,
        paddingRight: 4,
      }}
    >
      {/* Filetto con il colore dell'offerta: lega fra loro le attivita della
          stessa offerta senza occupare tutto il riempimento. */}
      {!collocazione.tagliataInizio ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 left-0"
          style={{ width: 3, background: dati.coloreOfferta }}
        />
      ) : null}

      {/* Giorni non lavorativi interni: riproduce le barre spezzate del beta. */}
      {dati.giorniNonLavorativi.map((colonna) => (
        <span
          key={colonna}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0"
          style={{
            left: colonna * larghezzaGiorno - collocazione.sinistra - SCOSTAMENTO_BARRA,
            width: larghezzaGiorno,
            background: TRATTEGGIO,
          }}
        />
      ))}

      {/* Segnale di rischio: l'offerta non ha margine sulla scadenza. */}
      {aRischio ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 right-0 bottom-0"
          style={{ width: 4, background: 'var(--semaforo-rosso)' }}
        />
      ) : null}

      {larghezza >= 52 ? <span className="relative truncate">{dati.etichetta}</span> : null}
    </button>
  );
});
