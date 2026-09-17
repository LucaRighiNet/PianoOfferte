import { describe, expect, it } from 'vitest';
import type { Ambiente } from './invio';
import {
  componiMessaggioGraph,
  ConfigurazioneGraphMancante,
  creaSpedizioniere,
  leggiConfigurazioneGraph,
} from './invio';
import type { Digest } from './contenuti';

const DIGEST: Digest = {
  destinatario: {
    personaId: 'p1',
    email: 'domenico.benassi@righisolutions.com',
    nome: 'Domenico',
    ruolo: 'OPERATORE',
  },
  oggetto: 'Offerte: 1 in ritardo',
  voci: [{ motivo: 'IN_RITARDO', testo: 'In ritardo di 3 giorni: Cummins' }],
  corpo: 'Ciao Domenico,\n\n- In ritardo di 3 giorni: Cummins\n',
};

const AMBIENTE_COMPLETO = {
  GRAPH_TENANT_ID: 't',
  GRAPH_CLIENT_ID: 'c',
  GRAPH_CLIENT_SECRET: 's',
  GRAPH_MITTENTE: 'offerte@righisolutions.com',
} satisfies Ambiente;

describe('configurazione Graph', () => {
  it('legge le quattro variabili', () => {
    expect(leggiConfigurazioneGraph(AMBIENTE_COMPLETO)).toEqual({
      tenantId: 't',
      clientId: 'c',
      clientSecret: 's',
      mittente: 'offerte@righisolutions.com',
    });
  });

  // Una configurazione incompleta deve fallire subito e dire quale variabile
  // manca: fallire al primo invio, di notte, direbbe solo "non ha funzionato".
  it.each([
    'GRAPH_TENANT_ID',
    'GRAPH_CLIENT_ID',
    'GRAPH_CLIENT_SECRET',
    'GRAPH_MITTENTE',
  ])('segnala la variabile mancante: %s', (variabile) => {
    const parziale = { ...AMBIENTE_COMPLETO, [variabile]: undefined };
    expect(() => leggiConfigurazioneGraph(parziale)).toThrow(ConfigurazioneGraphMancante);
    expect(() => leggiConfigurazioneGraph(parziale)).toThrow(variabile);
  });

  it('considera mancante anche una variabile vuota', () => {
    expect(() =>
      leggiConfigurazioneGraph({ ...AMBIENTE_COMPLETO, GRAPH_MITTENTE: '   ' }),
    ).toThrow(ConfigurazioneGraphMancante);
  });
});

describe('messaggio Graph', () => {
  it('compone destinatario, oggetto e corpo in testo semplice', () => {
    const messaggio = componiMessaggioGraph(DIGEST) as {
      message: {
        subject: string;
        body: { contentType: string; content: string };
        toRecipients: { emailAddress: { address: string } }[];
      };
      saveToSentItems: boolean;
    };
    expect(messaggio.message.subject).toBe('Offerte: 1 in ritardo');
    expect(messaggio.message.body.contentType).toBe('Text');
    expect(messaggio.message.toRecipients[0]?.emailAddress.address).toBe(
      'domenico.benassi@righisolutions.com',
    );
    expect(messaggio.saveToSentItems).toBe(false);
  });
});

describe('scelta del canale', () => {
  it('senza configurazione usa il registro', () => {
    expect(creaSpedizioniere({}).nome).toBe('registro');
  });

  it('usa Graph solo se richiesto esplicitamente e configurato', () => {
    expect(
      creaSpedizioniere({ ...AMBIENTE_COMPLETO, CANALE_NOTIFICHE: 'graph' }).nome,
    ).toBe('graph');
  });

  it('con Graph richiesto ma non configurato fallisce invece di spedire nel vuoto', () => {
    expect(() => creaSpedizioniere({ CANALE_NOTIFICHE: 'graph' })).toThrow(
      ConfigurazioneGraphMancante,
    );
  });
});
