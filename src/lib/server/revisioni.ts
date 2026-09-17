import 'server-only';
import { db } from '@/lib/db';
import { aDateUtc, aggiungiGiorni, daIstante, type DataCivile } from '@/lib/data/dataCivile';
import { caricaCalendario } from './pianificazione';

/**
 * Revisioni di offerta (S2).
 *
 * Nel settore quadri la revisione dopo l'invio e la norma, non l'eccezione: il
 * cliente chiede una modifica e il lavoro riparte. Senza tracciarla il tempo di
 * preparazione misurato resta parziale e la mediana sottostima il lavoro reale.
 *
 * Una revisione crea una nuova attivita sulla stessa offerta, assegnata a chi
 * l'aveva gia in mano, e riporta l'offerta in lavorazione.
 */

export class RevisioneNonPossibile extends Error {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = 'RevisioneNonPossibile';
  }
}

export interface RevisioneCreata {
  readonly id: string;
  readonly numero: number;
  readonly attivitaId: string;
  readonly dataInizio: DataCivile;
  readonly dataFine: DataCivile;
}

export interface NuovaRevisione {
  readonly offertaId: string;
  readonly motivo?: string | null;
  /** Nuova scadenza concordata col cliente, se e cambiata. */
  readonly nuovaScadenza?: DataCivile | null;
  readonly tipoAttivitaId?: string;
}

export async function creaRevisione(dati: NuovaRevisione): Promise<RevisioneCreata> {
  const offerta = await db.offerta.findUnique({
    where: { id: dati.offertaId },
    include: {
      attivita: { orderBy: { ordine: 'asc' } },
      revisioni: { orderBy: { numero: 'desc' }, take: 1 },
    },
  });
  if (!offerta) throw new RevisioneNonPossibile('Offerta non trovata');
  if (offerta.stato === 'DA_PIANIFICARE') {
    throw new RevisioneNonPossibile(
      'Una offerta non ancora pianificata non si revisiona: si modifica',
    );
  }

  const tipoRevisione = dati.tipoAttivitaId
    ? await db.tipoAttivita.findUnique({ where: { id: dati.tipoAttivitaId } })
    : await db.tipoAttivita.findFirst({ where: { nome: 'Revisione offerta', attivo: true } });
  if (!tipoRevisione) {
    throw new RevisioneNonPossibile(
      'Manca un tipo di attivita per le revisioni: configurarlo in Impostazioni',
    );
  }

  // L'ultima attivita per ordine e quella a cui agganciare la revisione.
  const ultima = offerta.attivita[offerta.attivita.length - 1];
  if (!ultima) throw new RevisioneNonPossibile('Offerta senza attivita');

  const personaId = ultima.personaId;
  if (personaId === null) {
    throw new RevisioneNonPossibile(
      'L ultima attivita non e assegnata: assegnala prima di aprire una revisione',
    );
  }

  const calendario = await caricaCalendario();
  const oggi = daIstante(new Date());
  // La revisione parte dal giorno lavorativo successivo alla fine dell'ultima
  // attivita, oppure da oggi se quella e gia conclusa nel passato.
  const partenza =
    ultima.dataFine === null
      ? oggi
      : (() => {
          const dopo = aggiungiGiorni(daIstante(ultima.dataFine, 'UTC'), 1);
          return dopo > oggi ? dopo : oggi;
        })();

  const collocazione = calendario.espandiDurata(
    personaId,
    partenza,
    Number(tipoRevisione.stimaDefaultOre),
  );

  const numero = (offerta.revisioni[0]?.numero ?? 0) + 1;

  return db.$transaction(async (tx) => {
    const attivita = await tx.attivita.create({
      data: {
        offertaId: offerta.id,
        tipoAttivitaId: tipoRevisione.id,
        personaId,
        stimaOre: tipoRevisione.stimaDefaultOre,
        dataInizio: aDateUtc(collocazione.dataInizio),
        dataFine: aDateUtc(collocazione.dataFine),
        ordine: ultima.ordine + 1,
      },
      select: { id: true },
    });

    await tx.dipendenza.create({
      data: { predecessoreId: ultima.id, successoreId: attivita.id },
    });

    const revisione = await tx.revisione.create({
      data: {
        offertaId: offerta.id,
        numero,
        data: aDateUtc(oggi),
        motivo: dati.motivo ?? null,
        attivitaId: attivita.id,
      },
      select: { id: true, numero: true },
    });

    await tx.offerta.update({
      where: { id: offerta.id },
      data: {
        stato: 'IN_REVISIONE',
        ...(dati.nuovaScadenza === undefined || dati.nuovaScadenza === null
          ? {}
          : { dataScadenzaCliente: aDateUtc(dati.nuovaScadenza) }),
        versione: { increment: 1 },
      },
    });

    await tx.eventoAudit.create({
      data: {
        entita: 'Offerta',
        entitaId: offerta.id,
        azione: 'REVISIONE',
        prima: { stato: offerta.stato },
        dopo: {
          stato: 'IN_REVISIONE',
          numero,
          oreAggiunte: Number(tipoRevisione.stimaDefaultOre),
        },
      },
    });

    return {
      id: revisione.id,
      numero: revisione.numero,
      attivitaId: attivita.id,
      dataInizio: collocazione.dataInizio,
      dataFine: collocazione.dataFine,
    };
  });
}

/** Numero di revisioni per offerta, per l'interfaccia. */
export async function contaRevisioni(offertaIds: readonly string[]): Promise<Map<string, number>> {
  if (offertaIds.length === 0) return new Map();
  const righe = await db.revisione.groupBy({
    by: ['offertaId'],
    where: { offertaId: { in: [...offertaIds] } },
    _max: { numero: true },
  });
  return new Map(righe.map((r) => [r.offertaId, r._max.numero ?? 0]));
}
