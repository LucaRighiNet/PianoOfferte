import { confronta, differenzaGiorni, giorniTra, type DataCivile } from '@/lib/data/dataCivile';
import type { CalendarioLavorativo } from '@/lib/calendario/calendarioLavorativo';

/**
 * Stato derivato, margine sulla scadenza e semaforo di rischio.
 *
 * Par. 14.3 del piano: lo stato memorizzato ha quattro valori. "In ritardo" non
 * si inserisce, si calcola, e si sovrappone come badge a In corso e a Bloccata.
 * Par. 5.1 M3: il margine sulla scadenza cliente e cio che trasforma la
 * timeline in uno strumento di rischio.
 */

export type StatoAttivitaMemorizzato =
  | 'NON_INIZIATA'
  | 'IN_CORSO'
  | 'BLOCCATA'
  | 'COMPLETATA';

export type StatoVisualizzato = StatoAttivitaMemorizzato | 'IN_RITARDO';

export interface AttivitaValutabile {
  readonly stato: StatoAttivitaMemorizzato;
  readonly dataFine: DataCivile | null;
  readonly iniziataIl: DataCivile | null;
}

/**
 * Vero se l'attivita doveva essere finita e non lo e.
 * Una attivita completata non e mai in ritardo, qualunque sia la data di fine.
 * Una attivita senza data pianificata non e in ritardo: e non pianificata.
 */
export function eInRitardo(attivita: AttivitaValutabile, oggi: DataCivile): boolean {
  if (attivita.stato === 'COMPLETATA') return false;
  if (attivita.dataFine === null) return false;
  return confronta(attivita.dataFine, oggi) < 0;
}

/** Stato da mostrare in colonna: il derivato prevale perche e piu urgente. */
export function statoVisualizzato(
  attivita: AttivitaValutabile,
  oggi: DataCivile,
): StatoVisualizzato {
  return eInRitardo(attivita, oggi) ? 'IN_RITARDO' : attivita.stato;
}

export const ETICHETTE_STATO: Readonly<Record<StatoVisualizzato, string>> = {
  NON_INIZIATA: 'Non iniziata',
  IN_CORSO: 'In corso',
  BLOCCATA: 'Bloccata',
  COMPLETATA: 'Completata',
  IN_RITARDO: 'In ritardo',
};

/**
 * Giorni da cui l'attivita e in lavorazione. Alimenta l'aging del WIP.
 * `null` se non risulta mai iniziata.
 */
export function anzianitaInCorso(
  attivita: AttivitaValutabile,
  oggi: DataCivile,
): number | null {
  if (attivita.iniziataIl === null) return null;
  if (attivita.stato === 'COMPLETATA') return null;
  return Math.max(0, differenzaGiorni(oggi, attivita.iniziataIl));
}

export type Semaforo = 'SENZA_SCADENZA' | 'VERDE' | 'AMBRA' | 'ROSSO' | 'SFORATA';

export interface SoglieMargine {
  /** Margine in giorni lavorativi sopra il quale il semaforo e verde. */
  readonly verdeDa: number;
  /** Margine minimo perche il semaforo sia ambra invece che rosso. */
  readonly ambraDa: number;
}

export const SOGLIE_MARGINE_PREDEFINITE: SoglieMargine = { verdeDa: 3, ambraDa: 1 };

export interface ValutazioneMargine {
  /** Giorni lavorativi fra la fine pianificata e la scadenza. `null` senza dati. */
  readonly margineGiorniLavorativi: number | null;
  /** Giorni di calendario, utile per la comunicazione al cliente. */
  readonly margineGiorniCalendario: number | null;
  readonly semaforo: Semaforo;
}

/**
 * Margine fra la fine pianificata dell'offerta e la scadenza del cliente.
 *
 * Il margine e in giorni lavorativi perche e quello il tempo effettivamente
 * recuperabile: due giorni di margine sul weekend non sono margine.
 * Il calendario di riferimento e quello della persona indicata; se non c'e
 * persona assegnata si usano i soli giorni di calendario.
 */
export function valutaMargine(
  dataFinePianificata: DataCivile | null,
  dataScadenzaCliente: DataCivile | null,
  opzioni: {
    readonly calendario?: CalendarioLavorativo;
    readonly personaId?: string | null;
    readonly soglie?: SoglieMargine;
  } = {},
): ValutazioneMargine {
  const soglie = opzioni.soglie ?? SOGLIE_MARGINE_PREDEFINITE;

  if (dataScadenzaCliente === null) {
    return {
      margineGiorniLavorativi: null,
      margineGiorniCalendario: null,
      semaforo: 'SENZA_SCADENZA',
    };
  }
  if (dataFinePianificata === null) {
    return {
      margineGiorniLavorativi: null,
      margineGiorniCalendario: null,
      semaforo: 'SENZA_SCADENZA',
    };
  }

  const margineCalendario = differenzaGiorni(dataScadenzaCliente, dataFinePianificata);

  if (margineCalendario < 0) {
    return {
      margineGiorniLavorativi: margineCalendario,
      margineGiorniCalendario: margineCalendario,
      semaforo: 'SFORATA',
    };
  }

  const margineLavorativo = contaGiorniLavorativi(
    dataFinePianificata,
    dataScadenzaCliente,
    opzioni.calendario,
    opzioni.personaId ?? null,
  );

  let semaforo: Semaforo;
  if (margineLavorativo >= soglie.verdeDa) semaforo = 'VERDE';
  else if (margineLavorativo >= soglie.ambraDa) semaforo = 'AMBRA';
  else semaforo = 'ROSSO';

  return {
    margineGiorniLavorativi: margineLavorativo,
    margineGiorniCalendario: margineCalendario,
    semaforo,
  };
}

/**
 * Giorni lavorativi fra `da` escluso e `a` incluso.
 * Senza calendario si escludono solo i weekend: e l'approssimazione usata per
 * le offerte non ancora assegnate a una persona.
 */
function contaGiorniLavorativi(
  da: DataCivile,
  a: DataCivile,
  calendario: CalendarioLavorativo | undefined,
  personaId: string | null,
): number {
  let conteggio = 0;
  for (const giorno of giorniTra(da, a)) {
    if (giorno === da) continue; // il giorno di fine lavoro non e margine
    if (calendario && personaId !== null) {
      if (calendario.eGiornoLavorativo(personaId, giorno)) conteggio += 1;
    } else {
      const iso = new Date(`${giorno}T00:00:00Z`).getUTCDay();
      if (iso !== 0 && iso !== 6) conteggio += 1;
    }
  }
  return conteggio;
}

export const ETICHETTE_SEMAFORO: Readonly<Record<Semaforo, string>> = {
  SENZA_SCADENZA: 'Senza scadenza',
  VERDE: 'In tempo',
  AMBRA: 'Margine stretto',
  ROSSO: 'Nessun margine',
  SFORATA: 'Oltre la scadenza',
};
