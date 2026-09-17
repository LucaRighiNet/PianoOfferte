import 'server-only';
import { db } from '@/lib/db';
import { aggiungiGiorni, daIstante, inizioSettimana, type DataCivile } from '@/lib/data/dataCivile';
import { caricaCalendario } from './pianificazione';
import { aggregaCarico, allocazionePerPersona, caricoGiornaliero } from '@/lib/capacita/saturazione';
import {
  digestPersonale,
  digestResponsabile,
  type AttivitaNotificabile,
  type DestinatarioDigest,
  type Digest,
} from '@/lib/notifiche/contenuti';
import { creaSpedizioniere } from '@/lib/notifiche/invio';

/**
 * Preparazione e invio del digest giornaliero (S3).
 *
 * Chiamato da uno scheduler esterno una volta al giorno. Non inventa
 * destinatari: scrive solo a chi ha davvero qualcosa da fare, perche una
 * notifica che arriva tutti i giorni comunque viene archiviata senza leggerla.
 */

/** Le ore viaggiano insieme all'attivita: un indice dopo un filtro non torna. */
interface AttivitaConOre extends AttivitaNotificabile {
  readonly stimaOre: number;
}

export interface EsitoDigest {
  readonly canale: string;
  readonly oggi: DataCivile;
  readonly personeConsiderate: number;
  /**
   * Messaggi, non persone: chi pianifica ne riceve due, uno personale e uno
   * con i punti da decidere. Tenerli distinti evita di leggere un numero per
   * un altro.
   */
  readonly messaggiInviati: number;
  readonly personeRaggiunte: number;
  readonly personeSenzaNovita: number;
  readonly errori: readonly { readonly email: string; readonly motivo: string }[];
}

export async function inviaDigestGiornaliero(): Promise<EsitoDigest> {
  const oggi = daIstante(new Date());
  const spedizioniere = creaSpedizioniere();

  const [persone, attivita, calendario] = await Promise.all([
    db.persona.findMany({
      where: { attiva: true },
      select: { id: true, nome: true, cognome: true, email: true, ruolo: true },
    }),
    db.attivita.findMany({
      where: { stato: { not: 'COMPLETATA' } },
      select: {
        id: true,
        personaId: true,
        stimaOre: true,
        dataInizio: true,
        dataFine: true,
        stato: true,
        causaleBlocco: true,
        tipoAttivita: { select: { nome: true } },
        offerta: {
          select: {
            codice: true,
            descrizione: true,
            dataScadenzaCliente: true,
            cliente: { select: { ragioneSociale: true } },
          },
        },
      },
    }),
    caricaCalendario(),
  ]);

  const notificabili: AttivitaConOre[] = attivita.map((a) => ({
    id: a.id,
    stimaOre: Number(a.stimaOre),
    personaId: a.personaId,
    cliente: a.offerta.cliente.ragioneSociale,
    descrizioneOfferta: a.offerta.descrizione,
    tipoAttivita: a.tipoAttivita.nome,
    dataInizio: a.dataInizio === null ? null : daIstante(a.dataInizio, 'UTC'),
    dataFine: a.dataFine === null ? null : daIstante(a.dataFine, 'UTC'),
    stato: a.stato as AttivitaNotificabile['stato'],
    causaleBlocco: a.causaleBlocco,
    scadenzaCliente:
      a.offerta.dataScadenzaCliente === null
        ? null
        : daIstante(a.offerta.dataScadenzaCliente, 'UTC'),
  }));

  // --- riepilogo per chi pianifica ------------------------------------------
  const daAssegnare = new Set(
    attivita.filter((a) => a.personaId === null || a.dataInizio === null).map((a) => a.offerta.codice),
  ).size;

  const sforate = notificabili
    .filter(
      (a) =>
        a.scadenzaCliente !== null &&
        a.dataFine !== null &&
        a.dataFine > a.scadenzaCliente,
    )
    .map((a) => `${a.cliente} ${a.descrizioneOfferta}`);

  const settimanaDa = inizioSettimana(oggi);
  const settimanaA = aggiungiGiorni(settimanaDa, 6);
  const allocazione = allocazionePerPersona(
    calendario,
    notificabili.map((a) => ({
      id: a.id,
      personaId: a.personaId,
      dataInizio: a.dataInizio,
      dataFine: a.dataFine,
      stimaOre: a.stimaOre,
    })),
  );

  const inSovraccarico = persone
    .filter((p) => {
      const carico = aggregaCarico(
        caricoGiornaliero(calendario, p.id, settimanaDa, settimanaA, allocazione.get(p.id)),
      );
      return carico.fascia === 'SOVRACCARICO';
    })
    .map((p) => `${p.cognome} ${p.nome}`);

  // --- composizione ---------------------------------------------------------
  const daInviare: Digest[] = [];
  for (const p of persone) {
    const destinatario: DestinatarioDigest = {
      personaId: p.id,
      email: p.email,
      nome: p.nome,
      ruolo: p.ruolo,
    };

    if (p.ruolo === 'RESPONSABILE' || p.ruolo === 'DIREZIONE') {
      const digest = digestResponsabile(destinatario, {
        daAssegnare,
        personeInSovraccarico: inSovraccarico,
        offerteSforate: [...new Set(sforate)],
      });
      if (digest !== null) daInviare.push(digest);
    }

    const personale = digestPersonale(destinatario, notificabili, oggi);
    if (personale !== null) daInviare.push(personale);
  }

  // --- invio ----------------------------------------------------------------
  const errori: { email: string; motivo: string }[] = [];
  let inviati = 0;
  for (const digest of daInviare) {
    try {
      await spedizioniere.invia(digest);
      inviati += 1;
    } catch (errore) {
      errori.push({
        email: digest.destinatario.email,
        motivo: errore instanceof Error ? errore.message : 'invio non riuscito',
      });
    }
  }

  const raggiunte = new Set(daInviare.map((d) => d.destinatario.email)).size;
  return {
    canale: spedizioniere.nome,
    oggi,
    personeConsiderate: persone.length,
    messaggiInviati: inviati,
    personeRaggiunte: raggiunte,
    personeSenzaNovita: persone.length - raggiunte,
    errori,
  };
}
