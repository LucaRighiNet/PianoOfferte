import { aggiungiGiorni, confronta, type DataCivile } from '@/lib/data/dataCivile';
import { CalendarioLavorativo } from '@/lib/calendario/calendarioLavorativo';

/**
 * Riprogrammazione di una attivita e della sua catena di successori (M9).
 *
 * Regola adottata: lo scorrimento CONSERVA IL MARGINE esistente fra una
 * attivita e la successiva. Se fra analisi e sviluppo c'erano due giorni
 * lavorativi di stacco, dopo lo spostamento ce ne sono ancora due. E' la regola
 * piu prevedibile: il pianificatore ritrova la forma che aveva costruito.
 *
 * Vincolo non negoziabile: un successore non inizia mai prima del primo giorno
 * lavorativo successivo alla fine del suo predecessore. Le dipendenze sono solo
 * Fine-Inizio, per la scelta del par. 5.4 del piano.
 */

export interface AnelloCatena {
  readonly id: string;
  readonly personaId: string | null;
  readonly stimaOre: number;
  readonly dataInizio: DataCivile | null;
  readonly dataFine: DataCivile | null;
}

export interface AnelloRiprogrammato {
  readonly id: string;
  readonly personaId: string;
  readonly dataInizio: DataCivile;
  readonly dataFine: DataCivile;
}

export interface ProblemaRiprogrammazione {
  readonly id: string;
  readonly motivo: string;
}

export interface EsitoRiprogrammazione {
  readonly aggiornate: readonly AnelloRiprogrammato[];
  readonly problemi: readonly ProblemaRiprogrammazione[];
}

/** Oltre questo stacco non ha senso conservare il margine: si tratta come slegato. */
const MARGINE_MASSIMO_GIORNI = 60;

/** Giorni lavorativi strettamente compresi fra `fine` e `inizioSuccessivo`. */
function margineLavorativo(
  calendario: CalendarioLavorativo,
  personaId: string,
  fine: DataCivile,
  inizioSuccessivo: DataCivile,
): number {
  if (confronta(inizioSuccessivo, fine) <= 0) return 0;
  let conteggio = 0;
  let corrente = aggiungiGiorni(fine, 1);
  while (confronta(corrente, inizioSuccessivo) < 0 && conteggio < MARGINE_MASSIMO_GIORNI) {
    if (calendario.eGiornoLavorativo(personaId, corrente)) conteggio += 1;
    corrente = aggiungiGiorni(corrente, 1);
  }
  return conteggio;
}

/** Il giorno lavorativo che segue `da`, saltando `giorni` giorni lavorativi. */
function avanzaGiorniLavorativi(
  calendario: CalendarioLavorativo,
  personaId: string,
  da: DataCivile,
  giorni: number,
): DataCivile | null {
  let corrente = calendario.prossimoGiornoLavorativo(personaId, aggiungiGiorni(da, 1));
  for (let i = 0; i < giorni && corrente !== null; i += 1) {
    corrente = calendario.prossimoGiornoLavorativo(personaId, aggiungiGiorni(corrente, 1));
  }
  return corrente;
}

export interface RadiceRiprogrammazione {
  readonly id: string;
  readonly personaId: string;
  readonly stimaOre: number;
  /** Data di fine attuale: serve a misurare il margine del primo successore. */
  readonly dataFineAttuale: DataCivile | null;
}

/**
 * Ricalcola la radice a partire da `inizioRichiesto` e a seguire la catena.
 * `successori` deve essere ordinato secondo la sequenza delle dipendenze.
 * Una attivita senza persona assegnata interrompe la catena: non e
 * pianificabile e i successori restano dove sono.
 */
export function riprogrammaCatena(
  calendario: CalendarioLavorativo,
  radice: RadiceRiprogrammazione,
  inizioRichiesto: DataCivile,
  successori: readonly AnelloCatena[],
): EsitoRiprogrammazione {
  const aggiornate: AnelloRiprogrammato[] = [];
  const problemi: ProblemaRiprogrammazione[] = [];

  let fineVecchia: DataCivile | null = radice.dataFineAttuale;
  let fineNuova: DataCivile;
  let personaPrecedente: string = radice.personaId;

  try {
    const p = calendario.espandiDurata(radice.personaId, inizioRichiesto, radice.stimaOre);
    aggiornate.push({
      id: radice.id,
      personaId: radice.personaId,
      dataInizio: p.dataInizio,
      dataFine: p.dataFine,
    });
    fineNuova = p.dataFine;
  } catch (errore) {
    problemi.push({ id: radice.id, motivo: messaggioDi(errore) });
    return { aggiornate, problemi };
  }

  for (const anello of successori) {
    if (anello.personaId === null) {
      problemi.push({ id: anello.id, motivo: 'Attivita non assegnata: la catena si ferma qui' });
      break;
    }

    // Il margine si misura sul calendario del predecessore, perche e li che si
    // era formato quando il piano e stato costruito.
    const margine =
      anello.dataInizio !== null && fineVecchia !== null
        ? margineLavorativo(calendario, personaPrecedente, fineVecchia, anello.dataInizio)
        : 0;

    const inizioProposto = avanzaGiorniLavorativi(
      calendario,
      anello.personaId,
      fineNuova,
      margine,
    );
    if (inizioProposto === null) {
      problemi.push({
        id: anello.id,
        motivo: 'Nessun giorno lavorativo disponibile dopo il predecessore',
      });
      break;
    }

    try {
      const p = calendario.espandiDurata(anello.personaId, inizioProposto, anello.stimaOre);
      aggiornate.push({
        id: anello.id,
        personaId: anello.personaId,
        dataInizio: p.dataInizio,
        dataFine: p.dataFine,
      });
      fineVecchia = anello.dataFine;
      fineNuova = p.dataFine;
      personaPrecedente = anello.personaId;
    } catch (errore) {
      problemi.push({ id: anello.id, motivo: messaggioDi(errore) });
      break;
    }
  }

  return { aggiornate, problemi };
}

function messaggioDi(errore: unknown): string {
  return errore instanceof Error ? errore.message : 'Riprogrammazione non riuscita';
}
