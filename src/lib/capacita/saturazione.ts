import { giorniTra, type DataCivile } from '@/lib/data/dataCivile';
import type { CalendarioLavorativo } from '@/lib/calendario/calendarioLavorativo';

/**
 * Calcolo del carico e della saturazione per persona.
 *
 * Formula del par. 6 del piano: ore allocate / capacita netta * 100.
 * Le soglie sono configurabili perche vanno ritarate sui dati reali della
 * divisione dopo due mesi di uso (par. 6 e rischio R6).
 */

export interface AttivitaAllocabile {
  readonly id: string;
  readonly personaId: string | null;
  readonly dataInizio: DataCivile | null;
  readonly dataFine: DataCivile | null;
  readonly stimaOre: number;
}

export type FasciaCarico = 'NON_LAVORATIVO' | 'SCARICO' | 'SANO' | 'PIENO' | 'SOVRACCARICO';

export interface SoglieCarico {
  readonly scaricoFinoA: number;
  readonly sanoFinoA: number;
  readonly pienoFinoA: number;
}

/** Soglie predefinite, par. 6 del piano. */
export const SOGLIE_PREDEFINITE: SoglieCarico = {
  scaricoFinoA: 40,
  sanoFinoA: 85,
  pienoFinoA: 100,
};

export interface CaricoGiorno {
  readonly giorno: DataCivile;
  readonly oreAllocate: number;
  readonly oreDisponibili: number;
  /** `null` quando non c'e capacita: la percentuale non e definita. */
  readonly percentuale: number | null;
  readonly fascia: FasciaCarico;
}

function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Ripartisce le ore di una attivita sui giorni lavorativi della sua finestra,
 * in proporzione alla capacita disponibile di ciascun giorno.
 *
 * Se la barra e stata allungata a mano oltre la durata naturale, le ore si
 * distribuiscono piu sottili: e la lettura onesta di una barra stirata.
 * Se la finestra non contiene capacita, tutte le ore restano sul primo giorno,
 * cosi la sovrallocazione resta visibile invece di sparire.
 */
export function ripartisciSuFinestra(
  calendario: CalendarioLavorativo,
  personaId: string,
  dataInizio: DataCivile,
  dataFine: DataCivile,
  ore: number,
): ReadonlyMap<DataCivile, number> {
  const risultato = new Map<DataCivile, number>();
  if (ore <= 0) return risultato;

  const giorni = giorniTra(dataInizio, dataFine);
  if (giorni.length === 0) return risultato;

  const disponibilita = giorni.map((g) => ({
    giorno: g,
    ore: calendario.oreDisponibili(personaId, g),
  }));
  const totaleDisponibile = disponibilita.reduce((acc, d) => acc + d.ore, 0);

  if (totaleDisponibile <= 0) {
    risultato.set(dataInizio, arrotonda(ore));
    return risultato;
  }

  let residuo = ore;
  const conCapacita = disponibilita.filter((d) => d.ore > 0);
  conCapacita.forEach((d, indice) => {
    const ultimo = indice === conCapacita.length - 1;
    // L'ultimo giorno assorbe il residuo, cosi la somma torna sempre esatta.
    const quota = ultimo ? residuo : arrotonda((ore * d.ore) / totaleDisponibile);
    residuo = arrotonda(residuo - quota);
    if (quota > 0) risultato.set(d.giorno, quota);
  });

  return risultato;
}

/**
 * Ore allocate per persona e per giorno.
 * Le attivita senza persona o senza date sono ignorate: stanno nella coda
 * "Da assegnare" e per definizione non consumano capacita.
 */
export function allocazionePerPersona(
  calendario: CalendarioLavorativo,
  attivita: readonly AttivitaAllocabile[],
): ReadonlyMap<string, ReadonlyMap<DataCivile, number>> {
  const risultato = new Map<string, Map<DataCivile, number>>();

  for (const a of attivita) {
    if (a.personaId === null || a.dataInizio === null || a.dataFine === null) continue;
    if (a.stimaOre <= 0) continue;
    // Senza il calendario di quella persona non si puo ripartire nulla: e il
    // caso di chi riceve un insieme ridotto di persone per visibilita.
    if (!calendario.conoscePersona(a.personaId)) continue;

    const quote = ripartisciSuFinestra(
      calendario,
      a.personaId,
      a.dataInizio,
      a.dataFine,
      a.stimaOre,
    );

    let perGiorno = risultato.get(a.personaId);
    if (!perGiorno) {
      perGiorno = new Map<DataCivile, number>();
      risultato.set(a.personaId, perGiorno);
    }
    for (const [giorno, ore] of quote) {
      perGiorno.set(giorno, arrotonda((perGiorno.get(giorno) ?? 0) + ore));
    }
  }

  return risultato;
}

export function fasciaDa(
  oreAllocate: number,
  oreDisponibili: number,
  soglie: SoglieCarico = SOGLIE_PREDEFINITE,
): FasciaCarico {
  if (oreDisponibili <= 0) return oreAllocate > 0 ? 'SOVRACCARICO' : 'NON_LAVORATIVO';
  const pct = (oreAllocate / oreDisponibili) * 100;
  if (pct <= soglie.scaricoFinoA) return 'SCARICO';
  if (pct <= soglie.sanoFinoA) return 'SANO';
  if (pct <= soglie.pienoFinoA) return 'PIENO';
  return 'SOVRACCARICO';
}

/** Carico giorno per giorno di una persona in un intervallo, estremi inclusi. */
export function caricoGiornaliero(
  calendario: CalendarioLavorativo,
  personaId: string,
  da: DataCivile,
  a: DataCivile,
  allocazione: ReadonlyMap<DataCivile, number> | undefined,
  soglie: SoglieCarico = SOGLIE_PREDEFINITE,
): readonly CaricoGiorno[] {
  return giorniTra(da, a).map((giorno) => {
    const oreAllocate = allocazione?.get(giorno) ?? 0;
    const oreDisponibili = calendario.oreDisponibili(personaId, giorno);
    return {
      giorno,
      oreAllocate,
      oreDisponibili,
      percentuale:
        oreDisponibili > 0 ? arrotonda((oreAllocate / oreDisponibili) * 100) : null,
      fascia: fasciaDa(oreAllocate, oreDisponibili, soglie),
    };
  });
}

export interface CaricoAggregato {
  readonly oreAllocate: number;
  readonly oreDisponibili: number;
  readonly percentuale: number | null;
  readonly fascia: FasciaCarico;
}

/** Aggrega un elenco di giorni, per la lettura settimanale della heatmap. */
export function aggregaCarico(
  giorni: readonly CaricoGiorno[],
  soglie: SoglieCarico = SOGLIE_PREDEFINITE,
): CaricoAggregato {
  const oreAllocate = arrotonda(giorni.reduce((acc, g) => acc + g.oreAllocate, 0));
  const oreDisponibili = arrotonda(giorni.reduce((acc, g) => acc + g.oreDisponibili, 0));
  return {
    oreAllocate,
    oreDisponibili,
    percentuale: oreDisponibili > 0 ? arrotonda((oreAllocate / oreDisponibili) * 100) : null,
    fascia: fasciaDa(oreAllocate, oreDisponibili, soglie),
  };
}
