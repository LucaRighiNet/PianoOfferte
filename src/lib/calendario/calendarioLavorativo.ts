import {
  aggiungiGiorni,
  confronta,
  eWeekend,
  giorniTra,
  type DataCivile,
} from '@/lib/data/dataCivile';
import { festivitaItaliane } from './festivita';

/**
 * Calendario lavorativo per persona.
 *
 * Implementa la regola del par. 14.4 del piano: la durata di una attivita e
 * espressa in ORE DI LAVORO, non in giorni di calendario. Le date di inizio e
 * fine si ricavano espandendo le ore sui giorni lavorativi della persona
 * assegnata, saltando weekend, festivita, chiusure aziendali e assenze.
 */

export interface PersonaCapacita {
  readonly id: string;
  /** Ore al giorno dedicate allo sviluppo offerte, non l'orario contrattuale. */
  readonly capacitaOreGiorno: number;
  /** Percentuale di contratto, da 1 a 100. */
  readonly percentualeContratto: number;
}

export interface VoceIndisponibilita {
  /** `null` indica un evento aziendale valido per tutte le persone. */
  readonly personaId: string | null;
  readonly dataInizio: DataCivile;
  readonly dataFine: DataCivile;
  /** Ore sottratte al giorno. `null` indica giorno intero non lavorativo. */
  readonly oreGiorno: number | null;
}

export interface QuotaGiornaliera {
  readonly giorno: DataCivile;
  readonly ore: number;
}

export interface Pianificazione {
  readonly dataInizio: DataCivile;
  readonly dataFine: DataCivile;
  readonly ripartizione: readonly QuotaGiornaliera[];
}

export class PersonaSconosciuta extends Error {
  constructor(personaId: string) {
    super(`Persona non presente nel calendario: ${personaId}`);
    this.name = 'PersonaSconosciuta';
  }
}

export class DurataNonPianificabile extends Error {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = 'DurataNonPianificabile';
  }
}

/** Oltre questo numero di giorni consecutivi senza capacita si smette di cercare. */
const ORIZZONTE_RICERCA_GIORNI = 400;

export class CalendarioLavorativo {
  readonly #persone: ReadonlyMap<string, PersonaCapacita>;
  readonly #perPersona: ReadonlyMap<string, readonly VoceIndisponibilita[]>;
  readonly #aziendali: readonly VoceIndisponibilita[];
  readonly #cacheOre = new Map<string, number>();
  readonly #cacheFestivita = new Map<number, ReadonlyMap<DataCivile, string>>();

  constructor(persone: readonly PersonaCapacita[], indisponibilita: readonly VoceIndisponibilita[]) {
    this.#persone = new Map(persone.map((p) => [p.id, p]));

    const perPersona = new Map<string, VoceIndisponibilita[]>();
    const aziendali: VoceIndisponibilita[] = [];
    for (const voce of indisponibilita) {
      if (voce.personaId === null) {
        aziendali.push(voce);
        continue;
      }
      const elenco = perPersona.get(voce.personaId);
      if (elenco) elenco.push(voce);
      else perPersona.set(voce.personaId, [voce]);
    }
    this.#perPersona = perPersona;
    this.#aziendali = aziendali;
  }

  #festivitaDi(giorno: DataCivile): ReadonlyMap<DataCivile, string> {
    const anno = Number(giorno.slice(0, 4));
    let cache = this.#cacheFestivita.get(anno);
    if (!cache) {
      cache = festivitaItaliane(anno);
      this.#cacheFestivita.set(anno, cache);
    }
    return cache;
  }

  /** Vero se il giorno e una festivita civile nazionale. */
  eFestivita(giorno: DataCivile): boolean {
    return this.#festivitaDi(giorno).has(giorno);
  }

  /** Nome della festivita, o `null` se il giorno e feriale. */
  nomeFestivita(giorno: DataCivile): string | null {
    return this.#festivitaDi(giorno).get(giorno) ?? null;
  }

  /**
   * Ore disponibili di una persona in un giorno, al netto di weekend,
   * festivita, chiusure aziendali e assenze individuali.
   */
  oreDisponibili(personaId: string, giorno: DataCivile): number {
    const chiave = `${personaId}|${giorno}`;
    const inCache = this.#cacheOre.get(chiave);
    if (inCache !== undefined) return inCache;

    const ore = this.#calcolaOre(personaId, giorno);
    this.#cacheOre.set(chiave, ore);
    return ore;
  }

  #calcolaOre(personaId: string, giorno: DataCivile): number {
    const persona = this.#persone.get(personaId);
    if (!persona) throw new PersonaSconosciuta(personaId);

    if (eWeekend(giorno)) return 0;
    if (this.eFestivita(giorno)) return 0;

    const base = (persona.capacitaOreGiorno * persona.percentualeContratto) / 100;
    if (base <= 0) return 0;

    let residuo = base;
    for (const voce of this.#vociApplicabili(personaId)) {
      if (confronta(giorno, voce.dataInizio) < 0) continue;
      if (confronta(giorno, voce.dataFine) > 0) continue;
      if (voce.oreGiorno === null) return 0; // assenza a giornata intera
      residuo -= voce.oreGiorno;
    }
    return residuo > 0 ? arrotonda(residuo) : 0;
  }

  *#vociApplicabili(personaId: string): Generator<VoceIndisponibilita> {
    yield* this.#aziendali;
    const proprie = this.#perPersona.get(personaId);
    if (proprie) yield* proprie;
  }

  /**
   * Vero se il calendario ha i dati di questa persona.
   *
   * Serve a chi riceve un insieme ridotto di persone per motivi di visibilita
   * (par. 14.1 del piano): le attivita altrui restano visibili, ma il loro
   * calendario no. Il chiamante degrada invece di sollevare eccezione, e senza
   * che qui si finga di sapere cose che non si sanno.
   */
  conoscePersona(personaId: string): boolean {
    return this.#persone.has(personaId);
  }

  eGiornoLavorativo(personaId: string, giorno: DataCivile): boolean {
    return this.oreDisponibili(personaId, giorno) > 0;
  }

  /**
   * Primo giorno con capacita a partire da `giorno` incluso.
   * Restituisce `null` se non ne esiste uno entro l'orizzonte di ricerca.
   */
  prossimoGiornoLavorativo(personaId: string, giorno: DataCivile): DataCivile | null {
    let corrente = giorno;
    for (let i = 0; i < ORIZZONTE_RICERCA_GIORNI; i += 1) {
      if (this.eGiornoLavorativo(personaId, corrente)) return corrente;
      corrente = aggiungiGiorni(corrente, 1);
    }
    return null;
  }

  /** Somma delle ore disponibili nell'intervallo, estremi inclusi. */
  capacitaNetta(personaId: string, da: DataCivile, a: DataCivile): number {
    let totale = 0;
    for (const giorno of giorniTra(da, a)) totale += this.oreDisponibili(personaId, giorno);
    return arrotonda(totale);
  }

  /**
   * Espande una durata in ore a partire da una data richiesta.
   *
   * L'inizio scivola al primo giorno lavorativo utile: una attivita non puo
   * cominciare in un giorno non lavorativo. La fine e l'ultimo giorno in cui
   * viene consumata almeno una frazione di ora.
   */
  espandiDurata(personaId: string, inizioRichiesto: DataCivile, oreTotali: number): Pianificazione {
    if (!this.#persone.has(personaId)) throw new PersonaSconosciuta(personaId);
    if (!Number.isFinite(oreTotali) || oreTotali <= 0) {
      throw new DurataNonPianificabile(
        `La durata deve essere un numero di ore maggiore di zero, ricevuto: ${oreTotali}`,
      );
    }

    const inizio = this.prossimoGiornoLavorativo(personaId, inizioRichiesto);
    if (inizio === null) {
      throw new DurataNonPianificabile(
        `Nessun giorno lavorativo per ${personaId} nei ${ORIZZONTE_RICERCA_GIORNI} giorni da ${inizioRichiesto}`,
      );
    }

    const ripartizione: QuotaGiornaliera[] = [];
    let residuo = oreTotali;
    let giorno = inizio;

    for (let i = 0; i < ORIZZONTE_RICERCA_GIORNI && residuo > 0; i += 1) {
      const disponibili = this.oreDisponibili(personaId, giorno);
      if (disponibili > 0) {
        const quota = Math.min(residuo, disponibili);
        ripartizione.push({ giorno, ore: arrotonda(quota) });
        residuo = arrotonda(residuo - quota);
      }
      if (residuo > 0) giorno = aggiungiGiorni(giorno, 1);
    }

    if (residuo > 0) {
      throw new DurataNonPianificabile(
        `Impossibile collocare ${oreTotali} ore per ${personaId} entro ${ORIZZONTE_RICERCA_GIORNI} giorni da ${inizio}: mancano ${residuo} ore`,
      );
    }

    const ultima = ripartizione[ripartizione.length - 1];
    /* c8 ignore next */
    if (!ultima) throw new DurataNonPianificabile('Ripartizione vuota, condizione non attesa');

    return { dataInizio: inizio, dataFine: ultima.giorno, ripartizione };
  }
}

/** Arrotonda a due decimali per evitare l'accumulo di errore sui float. */
function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
