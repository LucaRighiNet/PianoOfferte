import 'server-only';
import { db } from '@/lib/db';
import { daIstante, type DataCivile, aDateUtc } from '@/lib/data/dataCivile';
import type { StatoAttivitaMemorizzato } from '@/lib/offerta/rischio';
import { puoVedereCaricoNominativo, puoVedereValori, type Utente } from '@/lib/auth/permessi';

/**
 * Caricamento della finestra di pianificazione.
 *
 * Par. 7.3 del piano: il cambio di filtro deve costare meno di 150 ms e non
 * deve chiamare il server. Per ottenerlo si carica una volta l'intera finestra
 * temporale visibile e si filtra sul client. Il server limita per data, non per
 * filtro di interfaccia.
 */

export interface PersonaVista {
  readonly id: string;
  readonly nome: string;
  readonly cognome: string;
  readonly iniziali: string;
  readonly ruolo: string;
  readonly colore: string;
  readonly capacitaOreGiorno: number;
  readonly percentualeContratto: number;
  readonly limiteWip: number;
}

export interface OffertaVista {
  readonly id: string;
  readonly codice: string;
  readonly descrizione: string;
  readonly colore: string;
  readonly clienteId: string;
  readonly cliente: string;
  readonly kamId: string | null;
  readonly kam: string | null;
  readonly kamIniziali: string | null;
  readonly dataRichiesta: DataCivile;
  readonly dataScadenzaCliente: DataCivile | null;
  readonly stato: string;
  readonly priorita: string;
}

export interface AttivitaVista {
  readonly id: string;
  readonly offertaId: string;
  readonly tipoAttivitaId: string;
  readonly tipoAttivita: string;
  readonly personaId: string | null;
  readonly stimaOre: number;
  readonly consuntivoOre: number | null;
  readonly dataInizio: DataCivile | null;
  readonly dataFine: DataCivile | null;
  readonly stato: StatoAttivitaMemorizzato;
  readonly causaleBlocco: string | null;
  readonly iniziataIl: DataCivile | null;
  readonly ordine: number;
  readonly versione: number;
}

export interface DipendenzaVista {
  readonly predecessoreId: string;
  readonly successoreId: string;
}

export interface IndisponibilitaVista {
  readonly id: string;
  readonly personaId: string | null;
  readonly dataInizio: DataCivile;
  readonly dataFine: DataCivile;
  readonly tipo: string;
  readonly oreGiorno: number | null;
  readonly descrizione: string | null;
}

export interface TipoOffertaVista {
  readonly id: string;
  readonly nome: string;
  readonly righe: readonly { readonly tipoAttivita: string; readonly stimaOre: number }[];
  readonly oreTotali: number;
}

export interface TipoAttivitaVista {
  readonly id: string;
  readonly nome: string;
  readonly colore: string;
  readonly stimaDefaultOre: number;
}

export interface PianoDati {
  readonly utente: Utente;
  /** Vero se l'utente vede il carico nominativo di tutti, non solo il proprio. */
  readonly vedeTuttiICarichi: boolean;
  readonly vedeValori: boolean;
  readonly finestraDa: DataCivile;
  readonly finestraA: DataCivile;
  readonly oggi: DataCivile;
  readonly persone: readonly PersonaVista[];
  readonly offerte: readonly OffertaVista[];
  readonly attivita: readonly AttivitaVista[];
  readonly dipendenze: readonly DipendenzaVista[];
  readonly indisponibilita: readonly IndisponibilitaVista[];
  readonly tipiAttivita: readonly TipoAttivitaVista[];
  readonly tipiOfferta: readonly TipoOffertaVista[];
  readonly clienti: readonly { readonly id: string; readonly nome: string }[];
}

/** Le colonne `@db.Date` tornano da Prisma come mezzanotte UTC. */
function daColonnaData(valore: Date): DataCivile {
  return daIstante(valore, 'UTC');
}

function daColonnaDataOpz(valore: Date | null): DataCivile | null {
  return valore === null ? null : daColonnaData(valore);
}

function iniziali(nome: string, cognome: string): string {
  return `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase();
}

export async function caricaPiano(
  da: DataCivile,
  a: DataCivile,
  utente: Utente,
): Promise<PianoDati> {
  const daDate = aDateUtc(da);
  const aDate = aDateUtc(a);

  const [persone, clienti, tipiAttivita, tipiOfferta, attivita, indisponibilita] = await Promise.all(
    [
    db.persona.findMany({
      where: { attiva: true },
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    }),
    db.cliente.findMany({ where: { attivo: true }, orderBy: { ragioneSociale: 'asc' } }),
    db.tipoAttivita.findMany({ where: { attivo: true }, orderBy: { ordine: 'asc' } }),
    db.tipoOfferta.findMany({
      where: { attivo: true },
      orderBy: { ordine: 'asc' },
      include: {
        righe: {
          orderBy: { ordine: 'asc' },
          include: { tipoAttivita: { select: { nome: true } } },
        },
      },
    }),
    // Attivita che intersecano la finestra, piu quelle non pianificate (coda M5).
    db.attivita.findMany({
      where: {
        OR: [
          { dataInizio: { lte: aDate }, dataFine: { gte: daDate } },
          { dataInizio: null },
        ],
      },
      include: {
        tipoAttivita: { select: { nome: true } },
        offerta: {
          include: {
            cliente: { select: { id: true, ragioneSociale: true } },
            kam: { select: { id: true, nome: true, cognome: true } },
          },
        },
      },
      orderBy: [{ dataInizio: 'asc' }, { ordine: 'asc' }],
    }),
      db.indisponibilita.findMany({
        where: { dataInizio: { lte: aDate }, dataFine: { gte: daDate } },
      }),
    ],
  );

  // Le offerte si ricavano dalle attivita caricate: evita una seconda query e
  // garantisce che ogni riga di gruppo abbia almeno una attivita da mostrare.
  const offerteMappa = new Map<string, OffertaVista>();
  for (const a of attivita) {
    if (offerteMappa.has(a.offertaId)) continue;
    const o = a.offerta;
    offerteMappa.set(o.id, {
      id: o.id,
      codice: o.codice,
      descrizione: o.descrizione,
      colore: o.colore,
      clienteId: o.cliente.id,
      cliente: o.cliente.ragioneSociale,
      kamId: o.kam?.id ?? null,
      kam: o.kam ? `${o.kam.nome} ${o.kam.cognome}` : null,
      kamIniziali: o.kam ? iniziali(o.kam.nome, o.kam.cognome) : null,
      dataRichiesta: daColonnaData(o.dataRichiesta),
      dataScadenzaCliente: daColonnaDataOpz(o.dataScadenzaCliente),
      stato: o.stato,
      priorita: o.priorita,
    });
  }

  const idAttivita = new Set(attivita.map((a) => a.id));
  const dipendenze = await db.dipendenza.findMany({
    where: { predecessoreId: { in: [...idAttivita] } },
    select: { predecessoreId: true, successoreId: true },
  });

  /*
   * Chi non puo vedere il carico nominativo dei colleghi non lo riceve
   * nemmeno: la restrizione sta qui, al confine dei dati, e non
   * nell'interfaccia. Nasconderlo a schermo lasciandolo nella risposta
   * significherebbe non averlo nascosto. Par. 14.1 del piano.
   */
  const personeVisibili = persone.filter((p) =>
    puoVedereCaricoNominativo(utente.ruolo, utente.id, p.id),
  );

  return {
    utente,
    vedeTuttiICarichi: personeVisibili.length === persone.length,
    vedeValori: puoVedereValori(utente.ruolo),
    finestraDa: da,
    finestraA: a,
    oggi: daIstante(new Date()),
    persone: personeVisibili.map((p) => ({
      id: p.id,
      nome: p.nome,
      cognome: p.cognome,
      iniziali: iniziali(p.nome, p.cognome),
      ruolo: p.ruolo,
      colore: p.colore,
      capacitaOreGiorno: Number(p.capacitaOreGiorno),
      percentualeContratto: p.percentualeContratto,
      limiteWip: p.limiteWip,
    })),
    offerte: [...offerteMappa.values()],
    attivita: attivita.map((a) => ({
      id: a.id,
      offertaId: a.offertaId,
      tipoAttivitaId: a.tipoAttivitaId,
      tipoAttivita: a.tipoAttivita.nome,
      personaId: a.personaId,
      stimaOre: Number(a.stimaOre),
      consuntivoOre: a.consuntivoOre === null ? null : Number(a.consuntivoOre),
      dataInizio: daColonnaDataOpz(a.dataInizio),
      dataFine: daColonnaDataOpz(a.dataFine),
      stato: a.stato as StatoAttivitaMemorizzato,
      causaleBlocco: a.causaleBlocco,
      iniziataIl: daColonnaDataOpz(a.iniziataIl),
      ordine: a.ordine,
      versione: a.versione,
    })),
    // Solo le dipendenze con entrambi gli estremi nella finestra sono
    // disegnabili: una freccia verso il nulla confonde piu di quanto informa.
    dipendenze: dipendenze.filter((d) => idAttivita.has(d.successoreId)),
    indisponibilita: indisponibilita.map((i) => ({
      id: i.id,
      personaId: i.personaId,
      dataInizio: daColonnaData(i.dataInizio),
      dataFine: daColonnaData(i.dataFine),
      tipo: i.tipo,
      oreGiorno: i.oreGiorno === null ? null : Number(i.oreGiorno),
      descrizione: i.descrizione,
    })),
    tipiAttivita: tipiAttivita.map((t) => ({
      id: t.id,
      nome: t.nome,
      colore: t.colore,
      stimaDefaultOre: Number(t.stimaDefaultOre),
    })),
    tipiOfferta: tipiOfferta.map((t) => ({
      id: t.id,
      nome: t.nome,
      righe: t.righe.map((r) => ({
        tipoAttivita: r.tipoAttivita.nome,
        stimaOre: Number(r.stimaOre),
      })),
      oreTotali: t.righe.reduce((somma, r) => somma + Number(r.stimaOre), 0),
    })),
    clienti: clienti.map((c) => ({ id: c.id, nome: c.ragioneSociale })),
  };
}
