import 'server-only';
import { cookies, headers } from 'next/headers';
import { db } from '@/lib/db';
import {
  COOKIE_SVILUPPO,
  leggiIdentitaSviluppo,
  leggiPrincipalEasyAuth,
  modalitaConfigurata,
  type IdentitaGrezza,
  type ModalitaAutenticazione,
} from './identita';
import type { Ruolo, Utente } from './permessi';

/**
 * Risoluzione dell'utente della richiesta.
 *
 * L'identita arriva dalla piattaforma (Entra ID tramite Easy Auth) o dal
 * cookie di sviluppo; il RUOLO viene sempre dal database, mai dai claim. Cosi
 * chi amministra i permessi e l'azienda, in Impostazioni, e non chi configura
 * i gruppi della directory.
 */

export class AccessoNegato extends Error {
  readonly stato: number;
  constructor(messaggio: string, stato = 403) {
    super(messaggio);
    this.name = 'AccessoNegato';
    this.stato = stato;
  }
}

export function modalitaAutenticazione(): ModalitaAutenticazione {
  return modalitaConfigurata(process.env.MODALITA_AUTENTICAZIONE);
}

async function identitaDellaRichiesta(): Promise<IdentitaGrezza | null> {
  if (modalitaAutenticazione() === 'easyauth') {
    const intestazioni = await headers();
    return leggiPrincipalEasyAuth(intestazioni.get('x-ms-client-principal'));
  }
  const biscotti = await cookies();
  return leggiIdentitaSviluppo(biscotti.get(COOKIE_SVILUPPO)?.value);
}

/** Utente della richiesta, o `null` se non identificato o non censito. */
export async function utenteCorrente(): Promise<Utente | null> {
  const identita = await identitaDellaRichiesta();
  if (identita === null) return null;

  const persona = await db.persona.findFirst({
    where: {
      attiva: true,
      OR: [
        { email: identita.email },
        ...(identita.identificativoEsterno === null
          ? []
          : [{ entraObjectId: identita.identificativoEsterno }]),
      ],
    },
    select: { id: true, nome: true, cognome: true, email: true, ruolo: true },
  });
  if (!persona) return null;

  return {
    id: persona.id,
    nome: persona.nome,
    cognome: persona.cognome,
    email: persona.email,
    ruolo: persona.ruolo as Ruolo,
  };
}

/**
 * Utente della richiesta, o errore. Da usare nelle API: un'operazione di
 * scrittura senza utente identificato non deve andare a buon fine in silenzio.
 */
export async function richiediUtente(): Promise<Utente> {
  const utente = await utenteCorrente();
  if (utente === null) {
    throw new AccessoNegato(
      'Nessun utente identificato: accedi, oppure chiedi che la tua utenza venga censita',
      401,
    );
  }
  return utente;
}

/** Verifica un permesso e solleva `AccessoNegato` se manca. */
export function richiediPermesso(consentito: boolean, messaggio: string): void {
  if (!consentito) throw new AccessoNegato(messaggio);
}
