import { confronta, type DataCivile } from '@/lib/data/dataCivile';

/**
 * Impilamento delle attivita nella corsia di una persona.
 *
 * Par. 1.2 del piano: con 30-100 offerte al mese il layout "una riga per
 * attivita" produce 600-800 righe ed e inutilizzabile. Le attivita che non si
 * sovrappongono condividono la stessa riga; solo le sovrapposizioni reali
 * generano righe aggiuntive.
 *
 * L'algoritmo e la colorazione greedy di un grafo di intervalli: ordinando per
 * inizio e assegnando sempre la prima corsia libera si ottiene il numero minimo
 * di corsie, pari alla massima sovrapposizione simultanea.
 */

export interface IntervalloImpilabile {
  readonly id: string;
  readonly inizio: DataCivile;
  readonly fine: DataCivile;
}

export interface ElementoImpilato<T> {
  readonly elemento: T;
  readonly corsia: number;
}

export interface RisultatoImpilamento<T> {
  readonly corsie: number;
  readonly elementi: readonly ElementoImpilato<T>[];
}

/** Ordinamento deterministico: inizio, poi fine, poi id. */
function ordina<T extends IntervalloImpilabile>(a: T, b: T): number {
  const perInizio = confronta(a.inizio, b.inizio);
  if (perInizio !== 0) return perInizio;
  const perFine = confronta(a.fine, b.fine);
  if (perFine !== 0) return perFine;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Assegna a ogni elemento la corsia piu alta disponibile.
 * Gli intervalli con `fine` precedente a `inizio` sono scartati: una barra a
 * larghezza negativa non e rappresentabile e mascherare l'errore sarebbe peggio
 * che ometterla, quindi viene riportata in `scartati`.
 */
export function impilaInCorsie<T extends IntervalloImpilabile>(
  elementi: readonly T[],
): RisultatoImpilamento<T> & { readonly scartati: readonly T[] } {
  const validi: T[] = [];
  const scartati: T[] = [];
  for (const e of elementi) {
    if (confronta(e.fine, e.inizio) < 0) scartati.push(e);
    else validi.push(e);
  }

  const ordinati = [...validi].sort(ordina);
  // Ultima data occupata per ogni corsia.
  const fineCorsia: DataCivile[] = [];
  const risultato: ElementoImpilato<T>[] = [];

  for (const elemento of ordinati) {
    let corsia = fineCorsia.findIndex((fine) => confronta(fine, elemento.inizio) < 0);
    if (corsia === -1) {
      corsia = fineCorsia.length;
      fineCorsia.push(elemento.fine);
    } else {
      fineCorsia[corsia] = elemento.fine;
    }
    risultato.push({ elemento, corsia });
  }

  return { corsie: fineCorsia.length, elementi: risultato, scartati };
}

/**
 * Massimo numero di intervalli sovrapposti nello stesso istante.
 * Serve a verificare che l'impilamento non usi piu corsie del necessario.
 */
export function massimaSovrapposizione(elementi: readonly IntervalloImpilabile[]): number {
  const eventi: Array<{ giorno: DataCivile; delta: number }> = [];
  for (const e of elementi) {
    if (confronta(e.fine, e.inizio) < 0) continue;
    eventi.push({ giorno: e.inizio, delta: 1 });
    eventi.push({ giorno: e.fine, delta: -1 });
  }
  // A parita di giorno le aperture precedono le chiusure: gli intervalli sono
  // inclusivi, quindi due barre che si toccano nello stesso giorno collidono.
  eventi.sort((a, b) => {
    const perGiorno = confronta(a.giorno, b.giorno);
    if (perGiorno !== 0) return perGiorno;
    return b.delta - a.delta;
  });

  let corrente = 0;
  let massimo = 0;
  for (const evento of eventi) {
    corrente += evento.delta;
    if (corrente > massimo) massimo = corrente;
  }
  return massimo;
}
