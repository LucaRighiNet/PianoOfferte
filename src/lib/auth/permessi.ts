/**
 * Permessi per ruolo.
 *
 * Due vincoli guidano queste regole, entrambi dal par. 14.1 del piano:
 *
 * 1. I dati sulla prestazione di persone identificate non sono visibili a
 *    chiunque. La saturazione nominativa dei colleghi, il consuntivo ore e i
 *    valori economici stanno dietro un ruolo.
 * 2. Nessuna classifica fra persone. Un operatore vede il proprio carico e il
 *    dato aggregato del team, mai quello nominativo degli altri.
 *
 * Le regole sono funzioni pure: si verificano con un test, non con una lettura.
 */

export type Ruolo = 'RESPONSABILE' | 'OPERATORE' | 'KAM' | 'DIREZIONE' | 'SOLA_LETTURA';

export const RUOLI: readonly Ruolo[] = [
  'RESPONSABILE',
  'OPERATORE',
  'KAM',
  'DIREZIONE',
  'SOLA_LETTURA',
];

export const ETICHETTE_RUOLO: Readonly<Record<Ruolo, string>> = {
  RESPONSABILE: 'Responsabile di divisione',
  OPERATORE: 'Operatore',
  KAM: 'Key account manager',
  DIREZIONE: 'Direzione',
  SOLA_LETTURA: 'Sola lettura',
};

export interface Utente {
  readonly id: string;
  readonly nome: string;
  readonly cognome: string;
  readonly email: string;
  readonly ruolo: Ruolo;
}

/** Chi assegna, sposta e ridimensiona il lavoro. */
export function puoPianificare(ruolo: Ruolo): boolean {
  return ruolo === 'RESPONSABILE' || ruolo === 'DIREZIONE';
}

/** Chi inserisce una nuova richiesta di offerta (decisione D4). */
export function puoCreareOfferta(ruolo: Ruolo): boolean {
  return ruolo === 'RESPONSABILE' || ruolo === 'KAM' || ruolo === 'DIREZIONE';
}

/** Chi modifica capacita, calendario e stime. */
export function puoModificareImpostazioni(ruolo: Ruolo): boolean {
  return ruolo === 'RESPONSABILE' || ruolo === 'DIREZIONE';
}

/** Chi vede valore stimato delle offerte e indicatori economici. */
export function puoVedereValori(ruolo: Ruolo): boolean {
  return ruolo === 'RESPONSABILE' || ruolo === 'KAM' || ruolo === 'DIREZIONE';
}

/**
 * Chi vede la saturazione e il lavoro in corso di una persona con nome e
 * cognome. L'operatore vede i propri; degli altri vede solo l'aggregato.
 */
export function puoVedereCaricoNominativo(
  ruolo: Ruolo,
  utenteId: string,
  personaId: string,
): boolean {
  if (ruolo === 'RESPONSABILE' || ruolo === 'DIREZIONE') return true;
  return utenteId === personaId;
}

/**
 * Chi puo cambiare lo stato di una attivita: chi ce l'ha in mano, piu chi
 * pianifica. Un operatore non tocca il lavoro di un altro.
 */
export function puoCambiareStato(
  ruolo: Ruolo,
  utenteId: string,
  personaAssegnataId: string | null,
): boolean {
  if (ruolo === 'SOLA_LETTURA') return false;
  if (puoPianificare(ruolo)) return true;
  return personaAssegnataId !== null && personaAssegnataId === utenteId;
}

/**
 * Chi registra il consuntivo delle ore.
 *
 * Solo la persona che ha svolto il lavoro, sulle proprie attivita. Il
 * responsabile NON puo registrarlo al posto di altri: sarebbe un dato sulla
 * prestazione altrui inserito da un terzo, e non e cio che serve alla taratura
 * delle stime. Vedi par. 14.1.
 */
export function puoRegistrareConsuntivo(
  ruolo: Ruolo,
  utenteId: string,
  personaAssegnataId: string | null,
): boolean {
  if (ruolo === 'SOLA_LETTURA') return false;
  return personaAssegnataId !== null && personaAssegnataId === utenteId;
}

/**
 * Chi vede i consuntivi altrui in forma nominativa.
 * Nessuno tranne responsabile e direzione, e mai come classifica.
 */
export function puoVedereConsuntiviNominativi(ruolo: Ruolo): boolean {
  return ruolo === 'RESPONSABILE' || ruolo === 'DIREZIONE';
}

/**
 * La dashboard e visibile a tutti: non esiste una regola "puoVedereDashboard".
 * Cio che cambia per ruolo e il CONTENUTO dei riquadri, e lo decidono
 * `puoVedereCaricoNominativo` e `puoVedereValori`.
 */
