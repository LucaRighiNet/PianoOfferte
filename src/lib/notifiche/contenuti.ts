import { confronta, differenzaGiorni, type DataCivile } from '@/lib/data/dataCivile';
import { formatoBreve } from '@/lib/data/formato';

/**
 * Contenuto delle notifiche (S3).
 *
 * Par. 5.2 del piano: le notifiche portano lo strumento dove le persone gia
 * stanno, invece di pretendere che lo aprano. Ma una notifica che arriva sempre
 * viene ignorata sempre: qui si spedisce solo quando c'e qualcosa da fare, e
 * una persona senza niente da fare non riceve nulla.
 *
 * Il calcolo del contenuto sta separato dall'invio perche e la parte che decide
 * chi viene disturbato e perche, ed e l'unica che valga la pena verificare.
 */

export interface AttivitaNotificabile {
  readonly id: string;
  readonly personaId: string | null;
  readonly cliente: string;
  readonly descrizioneOfferta: string;
  readonly tipoAttivita: string;
  readonly dataInizio: DataCivile | null;
  readonly dataFine: DataCivile | null;
  readonly stato: 'NON_INIZIATA' | 'IN_CORSO' | 'BLOCCATA' | 'COMPLETATA';
  readonly causaleBlocco: string | null;
  readonly scadenzaCliente: DataCivile | null;
}

export interface DestinatarioDigest {
  readonly personaId: string;
  readonly email: string;
  readonly nome: string;
  readonly ruolo: string;
}

export interface VoceDigest {
  readonly motivo: 'IN_RITARDO' | 'INIZIA_OGGI' | 'BLOCCATA' | 'SCADENZA_VICINA';
  readonly testo: string;
}

export interface Digest {
  readonly destinatario: DestinatarioDigest;
  readonly oggetto: string;
  readonly voci: readonly VoceDigest[];
  readonly corpo: string;
}

const ETICHETTA_CAUSALE: Readonly<Record<string, string>> = {
  ATTESA_DATO_CLIENTE: 'in attesa di un dato dal cliente',
  ATTESA_QUOTAZIONE_FORNITORE: 'in attesa di una quotazione fornitore',
  ATTESA_SPECIFICA_TECNICA: 'in attesa di una specifica tecnica',
  PRIORITA_SUPERIORE: 'ferma per una priorita superiore',
  ALTRO: 'ferma',
};

/** Giorni di margine sotto i quali la scadenza si considera vicina. */
const SOGLIA_SCADENZA_GIORNI = 3;

function riferimento(a: AttivitaNotificabile): string {
  return `${a.cliente} · ${a.descrizioneOfferta} (${a.tipoAttivita})`;
}

/**
 * Digest personale: cosa deve sapere oggi chi ha del lavoro in mano.
 * Restituisce `null` se non c'e nulla da dire: silenzio invece di rumore.
 */
export function digestPersonale(
  destinatario: DestinatarioDigest,
  attivita: readonly AttivitaNotificabile[],
  oggi: DataCivile,
): Digest | null {
  const proprie = attivita.filter(
    (a) => a.personaId === destinatario.personaId && a.stato !== 'COMPLETATA',
  );

  const voci: VoceDigest[] = [];

  for (const a of proprie) {
    if (a.dataFine !== null && confronta(a.dataFine, oggi) < 0) {
      const giorni = differenzaGiorni(oggi, a.dataFine);
      voci.push({
        motivo: 'IN_RITARDO',
        testo: `In ritardo di ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}: ${riferimento(a)}`,
      });
    }
  }

  for (const a of proprie) {
    if (a.stato === 'BLOCCATA') {
      const causale = ETICHETTA_CAUSALE[a.causaleBlocco ?? 'ALTRO'] ?? 'ferma';
      voci.push({ motivo: 'BLOCCATA', testo: `Bloccata, ${causale}: ${riferimento(a)}` });
    }
  }

  for (const a of proprie) {
    if (a.dataInizio === oggi && a.stato === 'NON_INIZIATA') {
      voci.push({ motivo: 'INIZIA_OGGI', testo: `Inizia oggi: ${riferimento(a)}` });
    }
  }

  for (const a of proprie) {
    if (a.scadenzaCliente === null || a.stato === 'COMPLETATA') continue;
    const margine = differenzaGiorni(a.scadenzaCliente, oggi);
    if (margine < 0 || margine > SOGLIA_SCADENZA_GIORNI) continue;
    voci.push({
      motivo: 'SCADENZA_VICINA',
      testo: `Scadenza cliente il ${formatoBreve(a.scadenzaCliente)}: ${riferimento(a)}`,
    });
  }

  if (voci.length === 0) return null;

  const oggetto =
    voci.some((v) => v.motivo === 'IN_RITARDO')
      ? `Offerte: ${voci.filter((v) => v.motivo === 'IN_RITARDO').length} in ritardo`
      : `Offerte: ${voci.length} ${voci.length === 1 ? 'cosa' : 'cose'} da vedere oggi`;

  return {
    destinatario,
    oggetto,
    voci,
    corpo: componiCorpo(destinatario.nome, voci),
  };
}

export interface RiepilogoResponsabile {
  readonly daAssegnare: number;
  readonly personeInSovraccarico: readonly string[];
  readonly offerteSforate: readonly string[];
}

/**
 * Digest del responsabile: le tre cose che solo lui puo risolvere.
 * Anche qui, niente da fare significa nessuna notifica.
 */
export function digestResponsabile(
  destinatario: DestinatarioDigest,
  riepilogo: RiepilogoResponsabile,
): Digest | null {
  const voci: VoceDigest[] = [];

  if (riepilogo.offerteSforate.length > 0) {
    voci.push({
      motivo: 'SCADENZA_VICINA',
      testo: `${riepilogo.offerteSforate.length} offerte oltre la scadenza: ${riepilogo.offerteSforate
        .slice(0, 5)
        .join('; ')}`,
    });
  }
  if (riepilogo.daAssegnare > 0) {
    voci.push({
      motivo: 'INIZIA_OGGI',
      testo: `${riepilogo.daAssegnare} richieste in attesa di assegnazione`,
    });
  }
  if (riepilogo.personeInSovraccarico.length > 0) {
    voci.push({
      motivo: 'BLOCCATA',
      testo: `Sopra il 100% questa settimana: ${riepilogo.personeInSovraccarico.join(', ')}`,
    });
  }

  if (voci.length === 0) return null;

  return {
    destinatario,
    oggetto: `Divisione offerte: ${voci.length} ${voci.length === 1 ? 'punto' : 'punti'} da decidere`,
    voci,
    corpo: componiCorpo(destinatario.nome, voci),
  };
}

function componiCorpo(nome: string, voci: readonly VoceDigest[]): string {
  const righe = voci.map((v) => `- ${v.testo}`);
  return [
    `Ciao ${nome},`,
    '',
    ...righe,
    '',
    'Apri la pianificazione per intervenire.',
  ].join('\n');
}
