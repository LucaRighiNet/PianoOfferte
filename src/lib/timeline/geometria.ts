import { confronta, differenzaGiorni, type DataCivile } from '@/lib/data/dataCivile';

/**
 * Geometria delle barre sulla griglia temporale.
 *
 * La griglia e una colonna per giorno di larghezza costante. Una barra che
 * esce dalla finestra viene tagliata ai bordi invece che disegnata fuori:
 * disegnarla fuori costringerebbe il contenitore a scorrere all'infinito.
 */

export interface Collocazione {
  /** Distanza dal bordo sinistro della griglia, in pixel. */
  readonly sinistra: number;
  /** Larghezza in pixel, sempre maggiore di zero. */
  readonly larghezza: number;
  /** Vero se la barra comincia prima della finestra ed e stata tagliata. */
  readonly tagliataInizio: boolean;
  /** Vero se la barra finisce dopo la finestra ed e stata tagliata. */
  readonly tagliataFine: boolean;
}

/** Vero se l'intervallo ha almeno un giorno dentro la finestra. */
export function intersecaFinestra(
  finestraDa: DataCivile,
  finestraA: DataCivile,
  inizio: DataCivile,
  fine: DataCivile,
): boolean {
  if (confronta(fine, inizio) < 0) return false;
  return confronta(inizio, finestraA) <= 0 && confronta(fine, finestraDa) >= 0;
}

/**
 * Collocazione di una barra, tagliata ai bordi della finestra.
 * Restituisce `null` se l'intervallo non tocca la finestra o e invertito.
 */
export function collocaBarra(
  finestraDa: DataCivile,
  finestraA: DataCivile,
  larghezzaGiorno: number,
  inizio: DataCivile,
  fine: DataCivile,
): Collocazione | null {
  if (larghezzaGiorno <= 0) return null;
  if (!intersecaFinestra(finestraDa, finestraA, inizio, fine)) return null;

  const tagliataInizio = confronta(inizio, finestraDa) < 0;
  const tagliataFine = confronta(fine, finestraA) > 0;

  const inizioEffettivo = tagliataInizio ? finestraDa : inizio;
  const fineEffettiva = tagliataFine ? finestraA : fine;

  const offsetGiorni = differenzaGiorni(inizioEffettivo, finestraDa);
  const durataGiorni = differenzaGiorni(fineEffettiva, inizioEffettivo) + 1;

  return {
    sinistra: offsetGiorni * larghezzaGiorno,
    larghezza: durataGiorni * larghezzaGiorno,
    tagliataInizio,
    tagliataFine,
  };
}

/** Colonna, a partire da zero, del giorno indicato. `null` se fuori finestra. */
export function colonnaDelGiorno(
  finestraDa: DataCivile,
  finestraA: DataCivile,
  giorno: DataCivile,
): number | null {
  if (confronta(giorno, finestraDa) < 0) return null;
  if (confronta(giorno, finestraA) > 0) return null;
  return differenzaGiorni(giorno, finestraDa);
}

/**
 * Giorno corrispondente a una posizione orizzontale in pixel.
 * Usato dal trascinamento per sapere su quale giorno si sta rilasciando.
 */
export function giornoAllaPosizione(
  finestraDa: DataCivile,
  larghezzaGiorno: number,
  x: number,
): number {
  if (larghezzaGiorno <= 0) return 0;
  void finestraDa;
  return Math.floor(x / larghezzaGiorno);
}
