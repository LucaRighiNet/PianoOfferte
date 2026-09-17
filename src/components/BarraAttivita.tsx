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
 * occhio. I tipi di attivita sono cinque e restano leggibili.
 *
 * Di conseguenza il TESTO porta l'identita: cliente e descrizione dell'offerta,
 * non il tipo di attivita, che sarebbe una ripetizione del colore. Nella vista
 * per risorsa e l'unico punto in cui si legge di chi e il lavoro.
 *
 * Quando la barra e troppo stretta per contenere il testo, l'etichetta esce a
 * destra invece di sparire, ma solo se c'e spazio libero fino alla barra
 * successiva della stessa corsia: un'etichetta che si sovrappone a un'altra
 * barra e peggio di nessuna etichetta.
 */

export interface DatiBarra {
  readonly id: string;
  /** Testo mostrato sulla barra: identita, non tipo. */
  readonly etichetta: string;
  /** Nome del tipo di attivita: vive nel tooltip, il colore lo rappresenta gia. */
  readonly tipoAttivita: string;
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

/** Il bordo sinistro della barra rispetto al bordo della griglia. */
const SCOSTAMENTO_BARRA = 1;

/** Quale lato e stato tagliato dai bordi della finestra. */
function taglioDi(c: Collocazione): 'nessuno' | 'inizio' | 'fine' | 'entrambi' {
  if (c.tagliataInizio && c.tagliataFine) return 'entrambi';
  if (c.tagliataInizio) return 'inizio';
  if (c.tagliataFine) return 'fine';
  return 'nessuno';
}

export const BarraAttivita = memo(function BarraAttivita({
  dati,
  collocazione,
  larghezzaGiorno,
  altezza,
  alto,
  spazioDestra,
  selezionata,
  inMovimento = false,
  onSeleziona,
  onIniziaSpostamento,
  onIniziaRidimensionamento,
}: {
  dati: DatiBarra;
  collocazione: Collocazione;
  larghezzaGiorno: number;
  altezza: number;
  /** Distanza dal bordo superiore della zona corsie, in pixel. */
  alto: number;
  /** Pixel liberi fino alla barra successiva della stessa corsia. */
  spazioDestra: number;
  selezionata: boolean;
  /** La barra e quella che si sta trascinando: si attenua per non confondere. */
  inMovimento?: boolean;
  onSeleziona: (id: string) => void;
  onIniziaSpostamento?: (evento: React.PointerEvent) => void;
  onIniziaRidimensionamento?: (evento: React.PointerEvent) => void;
}) {
  const aRischio = dati.semaforo === 'ROSSO' || dati.semaforo === 'SFORATA';

  const titolo = [
    `${dati.cliente} — ${dati.offertaDescrizione}`,
    `${dati.tipoAttivita} · ${formatoOre(dati.stimaOre)}`,
    dati.persona ?? 'Non assegnata',
    `${formatoBreve(dati.dataInizio)} — ${formatoBreve(dati.dataFine)}`,
    `Stato: ${ETICHETTE_STATO[dati.stato]}`,
    dati.scadenza
      ? `Scadenza cliente: ${formatoBreve(dati.scadenza)} (${ETICHETTE_SEMAFORO[dati.semaforo]})`
      : 'Senza scadenza cliente',
    dati.offertaCodice,
  ].join('\n');

  const larghezza = Math.max(larghezzaGiorno - 2, collocazione.larghezza - 2);

  // Stima della larghezza del testo a 11px: evita di misurare il DOM per ogni
  // barra, che a 300 barre costerebbe piu di quanto valga la precisione.
  const larghezzaTesto = dati.etichetta.length * 5.6 + 14;
  const dentro = larghezza >= larghezzaTesto;
  const fuori = !dentro && spazioDestra >= larghezzaTesto + 8;

  return (
    <>
    <button
      type="button"
      onClick={() => onSeleziona(dati.id)}
      onPointerDown={onIniziaSpostamento}
      title={titolo}
      aria-label={titolo.replace(/\n/g, '. ')}
      className="barra-attivita focus-visible:ring-2"
      data-stato={dati.stato}
      data-taglio={taglioDi(collocazione)}
      data-selezionata={selezionata}
      data-in-movimento={inMovimento}
      data-trascinabile={onIniziaSpostamento !== undefined}
      style={{
        left: collocazione.sinistra + SCOSTAMENTO_BARRA,
        top: alto,
        width: larghezza,
        height: altezza,
        background: dati.coloreTipo,
      }}
    >
      {/* Filetto con il colore dell'offerta: lega fra loro le attivita della
          stessa offerta senza occupare tutto il riempimento. */}
      {!collocazione.tagliataInizio ? (
        <span aria-hidden="true" className="filetto-offerta" style={{ background: dati.coloreOfferta }} />
      ) : null}

      {/* Giorni non lavorativi interni: riproduce le barre spezzate del beta. */}
      {dati.giorniNonLavorativi.map((colonna) => (
        <span
          key={colonna}
          aria-hidden="true"
          className="tratteggio-barra"
          style={{
            left: colonna * larghezzaGiorno - collocazione.sinistra - SCOSTAMENTO_BARRA,
            width: larghezzaGiorno,
          }}
        />
      ))}

      {/* Segnale di rischio: l'offerta non ha margine sulla scadenza. */}
      {aRischio ? <span aria-hidden="true" className="segnale-rischio" /> : null}

      {dentro ? <span className="relative truncate">{dati.etichetta}</span> : null}

      {/* Maniglia di ridimensionamento sul bordo destro. Si mostra solo se la
          barra e abbastanza larga da non rendere impossibile afferrare il corpo. */}
      {onIniziaRidimensionamento && !collocazione.tagliataFine && larghezza >= 24 ? (
        <span
          role="presentation"
          onPointerDown={(e) => {
            e.stopPropagation();
            onIniziaRidimensionamento(e);
          }}
          className="absolute top-0 right-0 bottom-0"
          style={{ width: 7, cursor: 'ew-resize', touchAction: 'none' }}
          title="Trascina per cambiare la durata"
        />
      ) : null}
    </button>

    {fuori ? (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute truncate text-[11px] leading-none"
        style={{
          left: collocazione.sinistra + larghezza + 6,
          top: alto + (altezza - 11) / 2,
          maxWidth: spazioDestra - 8,
          color: 'var(--testo-tenue)',
          opacity: dati.stato === 'COMPLETATA' ? 0.5 : 1,
        }}
      >
        {dati.etichetta}
      </span>
    ) : null}
    </>
  );
});
