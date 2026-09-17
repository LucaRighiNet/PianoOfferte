import 'server-only';
import type { Digest } from './contenuti';

/**
 * Spedizione delle notifiche.
 *
 * Due realizzazioni, scelte da `CANALE_NOTIFICHE`:
 *
 * - `registro` (predefinito): scrive nel log del server. Non e un segnaposto:
 *   e il canale corretto finche non esistono le credenziali Microsoft, perche
 *   permette di verificare CHI verrebbe disturbato e PERCHE senza spedire
 *   niente a nessuno.
 * - `graph`: posta elettronica tramite Microsoft Graph, con credenziali
 *   applicative. Dipende dalla decisione D5 del piano.
 */

export interface Spedizioniere {
  readonly nome: string;
  invia(digest: Digest): Promise<void>;
}

export class SpedizioniereRegistro implements Spedizioniere {
  readonly nome = 'registro';

  async invia(digest: Digest): Promise<void> {
    console.warn(
      `[notifica] a ${digest.destinatario.email} — ${digest.oggetto}\n${digest.corpo}\n`,
    );
    return Promise.resolve();
  }
}

export class ConfigurazioneGraphMancante extends Error {
  constructor(variabile: string) {
    super(`Notifiche Graph: manca la variabile ${variabile}`);
    this.name = 'ConfigurazioneGraphMancante';
  }
}

interface ConfigurazioneGraph {
  readonly tenantId: string;
  readonly clientId: string;
  readonly clientSecret: string;
  /** Casella da cui parte la posta, per esempio offerte@righisolutions.com. */
  readonly mittente: string;
}

/** Solo le chiavi che servono: la firma dichiara cosa legge, non tutto l'ambiente. */
export type Ambiente = Readonly<Record<string, string | undefined>>;

export function leggiConfigurazioneGraph(ambiente: Ambiente = process.env): ConfigurazioneGraph {
  const richieste = [
    'GRAPH_TENANT_ID',
    'GRAPH_CLIENT_ID',
    'GRAPH_CLIENT_SECRET',
    'GRAPH_MITTENTE',
  ] as const;
  for (const variabile of richieste) {
    const valore = ambiente[variabile];
    if (valore === undefined || valore.trim() === '') {
      throw new ConfigurazioneGraphMancante(variabile);
    }
  }
  return {
    tenantId: ambiente.GRAPH_TENANT_ID as string,
    clientId: ambiente.GRAPH_CLIENT_ID as string,
    clientSecret: ambiente.GRAPH_CLIENT_SECRET as string,
    mittente: ambiente.GRAPH_MITTENTE as string,
  };
}

/** Corpo della richiesta `sendMail` di Microsoft Graph. */
export function componiMessaggioGraph(digest: Digest): Record<string, unknown> {
  return {
    message: {
      subject: digest.oggetto,
      body: { contentType: 'Text', content: digest.corpo },
      toRecipients: [{ emailAddress: { address: digest.destinatario.email } }],
    },
    saveToSentItems: false,
  };
}

export class SpedizioniereGraph implements Spedizioniere {
  readonly nome = 'graph';
  readonly #configurazione: ConfigurazioneGraph;
  #token: { valore: string; scadeIl: number } | null = null;

  constructor(configurazione: ConfigurazioneGraph) {
    this.#configurazione = configurazione;
  }

  async #ottieniToken(): Promise<string> {
    const adesso = Date.now();
    if (this.#token !== null && this.#token.scadeIl > adesso + 60_000) {
      return this.#token.valore;
    }

    const risposta = await fetch(
      `https://login.microsoftonline.com/${this.#configurazione.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.#configurazione.clientId,
          client_secret: this.#configurazione.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      },
    );
    if (!risposta.ok) {
      throw new Error(`Richiesta del token non riuscita (${risposta.status})`);
    }
    const corpo = (await risposta.json()) as { access_token?: string; expires_in?: number };
    if (corpo.access_token === undefined) throw new Error('Token assente nella risposta');

    this.#token = {
      valore: corpo.access_token,
      scadeIl: adesso + (corpo.expires_in ?? 3600) * 1000,
    };
    return corpo.access_token;
  }

  async invia(digest: Digest): Promise<void> {
    const token = await this.#ottieniToken();
    const risposta = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
        this.#configurazione.mittente,
      )}/sendMail`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(componiMessaggioGraph(digest)),
      },
    );
    if (!risposta.ok) {
      const dettaglio = await risposta.text().catch(() => '');
      throw new Error(
        `Invio a ${digest.destinatario.email} non riuscito (${risposta.status}) ${dettaglio.slice(0, 200)}`,
      );
    }
  }
}

export function creaSpedizioniere(ambiente: Ambiente = process.env): Spedizioniere {
  if (ambiente.CANALE_NOTIFICHE === 'graph') {
    return new SpedizioniereGraph(leggiConfigurazioneGraph(ambiente));
  }
  return new SpedizioniereRegistro();
}
