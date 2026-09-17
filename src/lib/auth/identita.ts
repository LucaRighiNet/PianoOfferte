/**
 * Lettura dell'identita dalla richiesta.
 *
 * Due modalita, scelte da `MODALITA_AUTENTICAZIONE`:
 *
 * - `easyauth`: l'applicazione sta dietro l'autenticazione integrata di Azure
 *   App Service o Container Apps, collegata a Microsoft Entra ID. La
 *   piattaforma verifica il token e inietta l'intestazione
 *   `x-ms-client-principal`, in base64, con i claim. Le richieste dall'esterno
 *   non possono impostare quelle intestazioni: la piattaforma le rimuove.
 *   Vedi la decisione D5 del piano.
 * - `sviluppo`: si sceglie chi essere da una pagina di accesso. Serve a
 *   lavorare e a provare i ruoli senza un tenant. NON e una autenticazione:
 *   chiunque puo scegliere qualunque identita. Per questo in produzione e
 *   rifiutata, a meno di un consenso esplicito (vedi `modalitaAmmessa`).
 *
 * Il parser sta qui, separato dall'accesso al database, perche e la parte che
 * puo sbagliare in silenzio e quindi va verificata con dei test.
 */

export interface IdentitaGrezza {
  readonly email: string;
  readonly nomeVisualizzato: string | null;
  readonly identificativoEsterno: string | null;
}

export type ModalitaAutenticazione = 'easyauth' | 'sviluppo';

export function modalitaConfigurata(valore: string | undefined): ModalitaAutenticazione {
  return valore === 'easyauth' ? 'easyauth' : 'sviluppo';
}

export class ModalitaNonAmmessa extends Error {
  constructor() {
    super(
      'Autenticazione non configurata: in produzione serve MODALITA_AUTENTICAZIONE=easyauth. ' +
        'La modalita sviluppo lascia scegliere qualunque identita a chiunque.',
    );
    this.name = 'ModalitaNonAmmessa';
  }
}

/**
 * La modalita sviluppo non e una autenticazione: chiunque puo dichiararsi
 * chiunque. Metterla in esercizio per dimenticanza aprirebbe il portale, quindi
 * in produzione va rifiutata. Resta possibile forzarla con un consenso
 * esplicito, che e un gesto deliberato e non un valore predefinito.
 */
export function modalitaAmmessa(
  modalita: ModalitaAutenticazione,
  ambiente: Readonly<Record<string, string | undefined>>,
): boolean {
  if (modalita === 'easyauth') return true;
  if (ambiente.NODE_ENV !== 'production') return true;
  return ambiente.CONSENTI_ACCESSO_SVILUPPO === 'si';
}

interface ClaimPrincipal {
  readonly typ?: string;
  readonly val?: string;
}

interface PrincipalEasyAuth {
  readonly claims?: readonly ClaimPrincipal[];
  readonly auth_typ?: string;
  readonly name_typ?: string;
}

/** Tipi di claim che portano l'indirizzo di posta, in ordine di preferenza. */
const CLAIM_EMAIL = [
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
  'preferred_username',
  'upn',
  'email',
] as const;

const CLAIM_NOME = [
  'name',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
] as const;

const CLAIM_OGGETTO = [
  'http://schemas.microsoft.com/identity/claims/objectidentifier',
  'oid',
] as const;

function primoClaim(
  claims: readonly ClaimPrincipal[],
  tipi: readonly string[],
): string | null {
  for (const tipo of tipi) {
    const trovato = claims.find((c) => c.typ === tipo && typeof c.val === 'string' && c.val !== '');
    if (trovato?.val !== undefined) return trovato.val;
  }
  return null;
}

/**
 * Decodifica l'intestazione `x-ms-client-principal`.
 * Restituisce `null` se manca, non e base64 valido, non e JSON, o non contiene
 * un indirizzo di posta: un'identita incompleta non e un'identita.
 */
export function leggiPrincipalEasyAuth(intestazione: string | null): IdentitaGrezza | null {
  if (intestazione === null || intestazione.trim() === '') return null;

  let testo: string;
  try {
    testo = Buffer.from(intestazione, 'base64').toString('utf8');
  } catch {
    return null;
  }

  let principal: PrincipalEasyAuth;
  try {
    principal = JSON.parse(testo) as PrincipalEasyAuth;
  } catch {
    return null;
  }

  const claims = principal.claims;
  if (!Array.isArray(claims) || claims.length === 0) return null;

  const email = primoClaim(claims, CLAIM_EMAIL);
  if (email === null) return null;

  return {
    email: email.toLowerCase(),
    nomeVisualizzato: primoClaim(claims, CLAIM_NOME),
    identificativoEsterno: primoClaim(claims, CLAIM_OGGETTO),
  };
}

/**
 * Identita in modalita sviluppo: il cookie contiene l'indirizzo di posta della
 * persona scelta nella pagina di accesso. Non e una credenziale e non pretende
 * di esserlo: vale solo quando `MODALITA_AUTENTICAZIONE` non e `easyauth`.
 */
export const COOKIE_SVILUPPO = 'piano-offerte-utente';

export function leggiIdentitaSviluppo(valoreCookie: string | undefined): IdentitaGrezza | null {
  if (valoreCookie === undefined || valoreCookie.trim() === '') return null;
  const email = decodeURIComponent(valoreCookie).trim().toLowerCase();
  if (!email.includes('@')) return null;
  return { email, nomeVisualizzato: null, identificativoEsterno: null };
}
