import 'server-only';
import { db } from '@/lib/db';
import { Prisma } from '@/generated/prisma';
import { aDateUtc, daIstante, type DataCivile } from '@/lib/data/dataCivile';

/**
 * Creazione di una nuova richiesta di offerta (M8).
 *
 * L'obiettivo dichiarato e sotto i 30 secondi e meno di sei interazioni: per
 * questo il tipo di offerta genera da solo le attivita con le loro stime, e il
 * cliente si puo creare digitandone il nome senza uscire dal modulo.
 *
 * Le attivita nascono senza persona assegnata: finiscono nella coda "Da
 * assegnare", che e il punto in cui il responsabile decide.
 */

export class DatiOffertaNonValidi extends Error {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = 'DatiOffertaNonValidi';
  }
}

const COLORI_OFFERTA = [
  '#0d9488', '#16a34a', '#ca8a04', '#8b5cf6', '#dc2626',
  '#7c3aed', '#0ea5e9', '#f59e0b', '#ec4899', '#65a30d',
] as const;

/**
 * Codice progressivo per anno, nella forma OF26-0001.
 * Il progressivo si ricava dal massimo esistente dell'anno: e sufficiente per
 * un volume di 30-100 offerte al mese con un solo punto di inserimento.
 */
async function prossimoCodice(oggi: DataCivile): Promise<string> {
  const anno = oggi.slice(2, 4);
  const prefisso = `OF${anno}-`;
  const ultima = await db.offerta.findFirst({
    where: { codice: { startsWith: prefisso } },
    orderBy: { codice: 'desc' },
    select: { codice: true },
  });
  const progressivo = ultima ? Number(ultima.codice.slice(prefisso.length)) + 1 : 1;
  return `${prefisso}${String(progressivo).padStart(4, '0')}`;
}

export interface NuovaOfferta {
  readonly descrizione: string;
  readonly clienteId?: string;
  readonly clienteNome?: string;
  readonly tipoOffertaId: string;
  readonly kamId?: string | null;
  readonly dataScadenzaCliente?: DataCivile | null;
  readonly valoreStimato?: number | null;
  readonly priorita?: 'BASSA' | 'NORMALE' | 'ALTA' | 'URGENTE';
  readonly note?: string | null;
}

export interface OffertaCreata {
  readonly id: string;
  readonly codice: string;
  readonly attivitaCreate: number;
}

export async function creaOfferta(dati: NuovaOfferta): Promise<OffertaCreata> {
  const tipo = await db.tipoOfferta.findUnique({
    where: { id: dati.tipoOffertaId },
    include: { righe: { orderBy: { ordine: 'asc' } } },
  });
  if (!tipo) throw new DatiOffertaNonValidi('Tipo di offerta inesistente');
  if (tipo.righe.length === 0) {
    throw new DatiOffertaNonValidi(
      `Il tipo "${tipo.nome}" non ha attivita nel template: configurarlo in Impostazioni`,
    );
  }

  const clienteId = await risolviCliente(dati);
  const oggi = daIstante(new Date());
  const codice = await prossimoCodice(oggi);
  const colore = COLORI_OFFERTA[Math.floor(Math.random() * COLORI_OFFERTA.length)] ?? '#0d9488';

  const creata = await db.$transaction(async (tx) => {
    const offerta = await tx.offerta.create({
      data: {
        codice,
        descrizione: dati.descrizione.trim(),
        clienteId,
        kamId: dati.kamId ?? null,
        tipoOffertaId: tipo.id,
        valoreStimato:
          dati.valoreStimato === null || dati.valoreStimato === undefined
            ? null
            : new Prisma.Decimal(dati.valoreStimato),
        dataRichiesta: aDateUtc(oggi),
        dataScadenzaCliente:
          dati.dataScadenzaCliente === null || dati.dataScadenzaCliente === undefined
            ? null
            : aDateUtc(dati.dataScadenzaCliente),
        priorita: dati.priorita ?? 'NORMALE',
        stato: 'DA_PIANIFICARE',
        colore,
        note: dati.note ?? null,
      },
      select: { id: true, codice: true },
    });

    // Le attivita nascono non assegnate e vengono legate a catena Fine-Inizio.
    const creaste = [];
    for (const riga of tipo.righe) {
      const attivita = await tx.attivita.create({
        data: {
          offertaId: offerta.id,
          tipoAttivitaId: riga.tipoAttivitaId,
          stimaOre: riga.stimaOre,
          ordine: riga.ordine,
        },
        select: { id: true },
      });
      creaste.push(attivita);
    }
    for (let i = 1; i < creaste.length; i += 1) {
      const predecessore = creaste[i - 1];
      const successore = creaste[i];
      if (!predecessore || !successore) continue;
      await tx.dipendenza.create({
        data: { predecessoreId: predecessore.id, successoreId: successore.id },
      });
    }

    await tx.eventoAudit.create({
      data: {
        entita: 'Offerta',
        entitaId: offerta.id,
        azione: 'CREAZIONE',
        dopo: { codice: offerta.codice, attivita: creaste.length },
      },
    });

    return { id: offerta.id, codice: offerta.codice, attivitaCreate: creaste.length };
  });

  return creata;
}

async function risolviCliente(dati: NuovaOfferta): Promise<string> {
  if (dati.clienteId !== undefined && dati.clienteId !== '') {
    const esistente = await db.cliente.findUnique({ where: { id: dati.clienteId } });
    if (!esistente) throw new DatiOffertaNonValidi('Cliente inesistente');
    return esistente.id;
  }

  const nome = dati.clienteNome?.trim();
  if (nome === undefined || nome === '') {
    throw new DatiOffertaNonValidi('Indicare un cliente esistente o il nome di uno nuovo');
  }

  // Creazione al volo: fermare l'inserimento per andare a creare l'anagrafica
  // altrove e' il modo piu rapido per far abbandonare lo strumento.
  const esistentePerNome = await db.cliente.findUnique({ where: { ragioneSociale: nome } });
  if (esistentePerNome) return esistentePerNome.id;

  const nuovo = await db.cliente.create({ data: { ragioneSociale: nome } });
  return nuovo.id;
}
