import 'server-only';
import { db } from '@/lib/db';
import { aDateUtc, daIstante, type DataCivile } from '@/lib/data/dataCivile';
import {
  CalendarioLavorativo,
  type PersonaCapacita,
  type VoceIndisponibilita,
} from '@/lib/calendario/calendarioLavorativo';
import {
  riprogrammaCatena,
  type AnelloCatena,
  type EsitoRiprogrammazione,
} from '@/lib/pianificazione/riprogrammazione';

/**
 * Servizio di pianificazione lato server.
 *
 * Le date non arrivano mai dal client: il client dice "sposta qui" e il server
 * ricalcola con il calendario reale. Altrimenti due browser con dati di
 * calendario diversi produrrebbero piani diversi.
 */

export class ConflittoDiVersione extends Error {
  readonly versioneAttuale: number;
  constructor(versioneAttuale: number) {
    super('La riga e stata modificata da qualcun altro');
    this.name = 'ConflittoDiVersione';
    this.versioneAttuale = versioneAttuale;
  }
}

export class AttivitaInesistente extends Error {
  constructor(id: string) {
    super(`Attivita non trovata: ${id}`);
    this.name = 'AttivitaInesistente';
  }
}

export class PianificazioneRifiutata extends Error {
  readonly problemi: readonly { readonly id: string; readonly motivo: string }[];
  constructor(problemi: readonly { readonly id: string; readonly motivo: string }[]) {
    super(problemi[0]?.motivo ?? 'Pianificazione non riuscita');
    this.name = 'PianificazioneRifiutata';
    this.problemi = problemi;
  }
}

interface AttivitaAttuale {
  readonly personaId: string | null;
  readonly dataInizio: Date | null;
  readonly dataFine: Date | null;
}

/**
 * Riporta una attivita nella coda "Da assegnare": nessuna persona, nessuna
 * data. I successori restano dove sono: disfare una assegnazione non deve
 * spostare lavoro che qualcun altro ha gia in mano.
 */
async function disassegna(
  attivitaId: string,
  attuale: AttivitaAttuale,
  utenteId: string | null,
): Promise<EsitoPianificazione> {
  const versioni: Record<string, number> = {};

  await db.$transaction(async (tx) => {
    const aggiornata = await tx.attivita.update({
      where: { id: attivitaId },
      data: {
        personaId: null,
        dataInizio: null,
        dataFine: null,
        versione: { increment: 1 },
      },
      select: { id: true, versione: true, offertaId: true },
    });
    versioni[aggiornata.id] = aggiornata.versione;

    // Se non resta nessuna attivita assegnata, l'offerta torna da pianificare.
    const ancoraAssegnate = await tx.attivita.count({
      where: { offertaId: aggiornata.offertaId, personaId: { not: null } },
    });
    if (ancoraAssegnate === 0) {
      await tx.offerta.updateMany({
        where: { id: aggiornata.offertaId, stato: { in: ['PIANIFICATA', 'IN_LAVORAZIONE'] } },
        data: { stato: 'DA_PIANIFICARE' },
      });
    }

    await tx.eventoAudit.create({
      data: {
        entita: 'Attivita',
        entitaId: attivitaId,
        utenteId,
        azione: 'DISASSEGNAZIONE',
        prima: {
          personaId: attuale.personaId,
          dataInizio: attuale.dataInizio?.toISOString() ?? null,
          dataFine: attuale.dataFine?.toISOString() ?? null,
        },
        dopo: { personaId: null },
      },
    });
  });

  return { aggiornate: [], problemi: [], versioni };
}

/** Costruisce il calendario dai dati correnti di persone e indisponibilita. */
export async function caricaCalendario(): Promise<CalendarioLavorativo> {
  const [persone, indisponibilita] = await Promise.all([
    db.persona.findMany({
      where: { attiva: true },
      select: { id: true, capacitaOreGiorno: true, percentualeContratto: true },
    }),
    db.indisponibilita.findMany({
      select: { personaId: true, dataInizio: true, dataFine: true, oreGiorno: true },
    }),
  ]);

  const capacita: PersonaCapacita[] = persone.map((p) => ({
    id: p.id,
    capacitaOreGiorno: Number(p.capacitaOreGiorno),
    percentualeContratto: p.percentualeContratto,
  }));
  const voci: VoceIndisponibilita[] = indisponibilita.map((i) => ({
    personaId: i.personaId,
    dataInizio: daIstante(i.dataInizio, 'UTC'),
    dataFine: daIstante(i.dataFine, 'UTC'),
    oreGiorno: i.oreGiorno === null ? null : Number(i.oreGiorno),
  }));

  return new CalendarioLavorativo(capacita, voci);
}

/** Oltre questa lunghezza una catena non e un piano: e un dato corrotto. */
const LUNGHEZZA_MASSIMA_CATENA = 50;

/**
 * Successori di una attivita, in ordine di catena.
 *
 * Lo schema garantisce al massimo un successore e un predecessore per
 * attivita, quindi il grafo delle dipendenze e per costruzione una unione di
 * cammini semplici e qui basta percorrerne uno. Non servono ordinamento
 * topologico ne cammino critico: non c'e un grafo su cui calcolarli, ed e la
 * scelta del par. 5.4 del piano.
 *
 * I vincoli di unicita non escludono i cicli (a -> b -> c -> a): li intercetta
 * l'insieme dei visitati, e il limite di lunghezza e la rete di sicurezza.
 */
export async function caricaSuccessori(attivitaId: string): Promise<AnelloCatena[]> {
  const catena: AnelloCatena[] = [];
  const visitati = new Set<string>([attivitaId]);
  let corrente = attivitaId;

  for (let passo = 0; passo < LUNGHEZZA_MASSIMA_CATENA; passo += 1) {
    const legame = await db.dipendenza.findUnique({
      where: { predecessoreId: corrente },
      select: {
        successore: {
          select: {
            id: true,
            personaId: true,
            stimaOre: true,
            dataInizio: true,
            dataFine: true,
          },
        },
      },
    });
    const prossimo = legame?.successore;
    if (!prossimo || visitati.has(prossimo.id)) break;

    visitati.add(prossimo.id);
    catena.push({
      id: prossimo.id,
      personaId: prossimo.personaId,
      stimaOre: Number(prossimo.stimaOre),
      dataInizio: prossimo.dataInizio === null ? null : daIstante(prossimo.dataInizio, 'UTC'),
      dataFine: prossimo.dataFine === null ? null : daIstante(prossimo.dataFine, 'UTC'),
    });
    corrente = prossimo.id;
  }

  return catena;
}

export interface RichiestaPianificazione {
  readonly attivitaId: string;
  readonly versione: number;
  /**
   * Nuova persona assegnata. `undefined` lascia quella attuale.
   * `null` disfa l'assegnazione: l'attivita torna nella coda "Da assegnare"
   * e perde le date. Serve per annullare un rilascio sbagliato e, da solo,
   * per togliere di mano un lavoro assegnato alla persona sbagliata.
   */
  readonly personaId?: string | null;
  /** Nuovo inizio richiesto. `undefined` lascia quello attuale. */
  readonly dataInizio?: DataCivile;
  /** Nuova stima in ore. `undefined` lascia quella attuale. */
  readonly stimaOre?: number;
  /**
   * Nuova fine richiesta, per il ridimensionamento della barra. Le ore si
   * ricavano dalla capacita reale della persona fra inizio e fine: il client
   * non conosce il calendario e non deve indovinarle.
   * Ignorata se `stimaOre` e presente.
   */
  readonly dataFine?: DataCivile;
  readonly utenteId?: string | null;
}

export interface EsitoPianificazione {
  readonly aggiornate: EsitoRiprogrammazione['aggiornate'];
  readonly problemi: EsitoRiprogrammazione['problemi'];
  readonly versioni: Readonly<Record<string, number>>;
}

/**
 * Assegna, sposta o ridimensiona una attivita e riprogramma la catena.
 *
 * Il controllo di concorrenza e sulla sola radice: i successori sono
 * conseguenza di quella modifica, non modifiche indipendenti. Le loro versioni
 * vengono comunque incrementate, cosi un client che li stia modificando riceve
 * un conflitto al proprio salvataggio.
 */
export async function pianificaAttivita(
  richiesta: RichiestaPianificazione,
): Promise<EsitoPianificazione> {
  const attuale = await db.attivita.findUnique({
    where: { id: richiesta.attivitaId },
    select: {
      id: true,
      versione: true,
      personaId: true,
      stimaOre: true,
      dataInizio: true,
      dataFine: true,
    },
  });
  if (!attuale) throw new AttivitaInesistente(richiesta.attivitaId);
  if (attuale.versione !== richiesta.versione) throw new ConflittoDiVersione(attuale.versione);

  // Disassegnazione esplicita: nessun calcolo di calendario, si torna in coda.
  if (richiesta.personaId === null) {
    return disassegna(attuale.id, attuale, richiesta.utenteId ?? null);
  }

  const personaId = richiesta.personaId ?? attuale.personaId;
  if (personaId === null) {
    throw new PianificazioneRifiutata([
      { id: attuale.id, motivo: 'Serve una risorsa assegnata per collocare l attivita' },
    ]);
  }

  const inizioRichiesto =
    richiesta.dataInizio ??
    (attuale.dataInizio === null ? daIstante(new Date()) : daIstante(attuale.dataInizio, 'UTC'));

  const [calendario, successori] = await Promise.all([
    caricaCalendario(),
    caricaSuccessori(richiesta.attivitaId),
  ]);

  let stimaOre = richiesta.stimaOre ?? Number(attuale.stimaOre);
  if (richiesta.stimaOre === undefined && richiesta.dataFine !== undefined) {
    const inizioEffettivo = calendario.prossimoGiornoLavorativo(personaId, inizioRichiesto);
    if (inizioEffettivo === null) {
      throw new PianificazioneRifiutata([
        { id: attuale.id, motivo: 'Nessun giorno lavorativo disponibile per questa risorsa' },
      ]);
    }
    const ore = calendario.capacitaNetta(personaId, inizioEffettivo, richiesta.dataFine);
    if (ore <= 0) {
      throw new PianificazioneRifiutata([
        {
          id: attuale.id,
          motivo: 'L intervallo scelto non contiene giorni lavorativi per questa risorsa',
        },
      ]);
    }
    stimaOre = ore;
  }

  /*
   * Assegnando una attivita si assegnano anche i suoi successori ancora liberi,
   * alla stessa persona. Nel processo offerta la sequenza analisi -> sviluppo la
   * svolge quasi sempre la stessa persona, e senza questa regola una nuova
   * richiesta richiederebbe un trascinamento per ogni attivita del template.
   * Riassegnare un singolo anello resta possibile trascinandolo su un'altra
   * corsia.
   */
  const catena: AnelloCatena[] =
    richiesta.personaId === undefined
      ? successori
      : successori.map((a) => (a.personaId === null ? { ...a, personaId } : a));

  const esito = riprogrammaCatena(
    calendario,
    {
      id: attuale.id,
      personaId,
      stimaOre,
      dataFineAttuale: attuale.dataFine === null ? null : daIstante(attuale.dataFine, 'UTC'),
    },
    inizioRichiesto,
    catena,
  );

  if (esito.aggiornate.length === 0) throw new PianificazioneRifiutata(esito.problemi);

  const versioni: Record<string, number> = {};
  await db.$transaction(async (tx) => {
    for (const a of esito.aggiornate) {
      const aggiornata = await tx.attivita.update({
        where: { id: a.id },
        data: {
          personaId: a.personaId,
          dataInizio: aDateUtc(a.dataInizio),
          dataFine: aDateUtc(a.dataFine),
          ...(a.id === attuale.id &&
          (richiesta.stimaOre !== undefined || richiesta.dataFine !== undefined)
            ? { stimaOre }
            : {}),
          versione: { increment: 1 },
        },
        select: { id: true, versione: true },
      });
      versioni[aggiornata.id] = aggiornata.versione;
    }

    // Assegnare una attivita fa uscire l'offerta dalla coda.
    if (richiesta.personaId !== undefined) {
      await tx.offerta.updateMany({
        where: { attivita: { some: { id: attuale.id } }, stato: 'DA_PIANIFICARE' },
        data: { stato: 'PIANIFICATA' },
      });
    }

    await tx.eventoAudit.create({
      data: {
        entita: 'Attivita',
        entitaId: attuale.id,
        utenteId: richiesta.utenteId ?? null,
        azione: richiesta.personaId !== undefined ? 'ASSEGNAZIONE' : 'RIPIANIFICAZIONE',
        prima: {
          personaId: attuale.personaId,
          dataInizio: attuale.dataInizio?.toISOString() ?? null,
          dataFine: attuale.dataFine?.toISOString() ?? null,
          stimaOre: Number(attuale.stimaOre),
        },
        dopo: {
          personaId,
          dataInizio: esito.aggiornate[0]?.dataInizio ?? null,
          dataFine: esito.aggiornate[0]?.dataFine ?? null,
          stimaOre,
          anelliRiprogrammati: esito.aggiornate.length,
        },
      },
    });
  });

  return { aggiornate: esito.aggiornate, problemi: esito.problemi, versioni };
}
