import { describe, expect, it } from 'vitest';
import {
  leggiIdentitaSviluppo,
  leggiPrincipalEasyAuth,
  modalitaAmmessa,
  modalitaConfigurata,
} from './identita';

function codifica(oggetto: unknown): string {
  return Buffer.from(JSON.stringify(oggetto), 'utf8').toString('base64');
}

describe('modalita configurata', () => {
  it('easyauth solo se richiesto esplicitamente', () => {
    expect(modalitaConfigurata('easyauth')).toBe('easyauth');
  });

  // Il default e la modalita meno privilegiata: un errore di configurazione
  // non deve far credere all'applicazione di essere protetta da Entra ID.
  it('qualunque altro valore, o nessuno, vale sviluppo', () => {
    expect(modalitaConfigurata(undefined)).toBe('sviluppo');
    expect(modalitaConfigurata('')).toBe('sviluppo');
    expect(modalitaConfigurata('EasyAuth')).toBe('sviluppo');
    expect(modalitaConfigurata('produzione')).toBe('sviluppo');
  });
});

describe('principal Easy Auth', () => {
  it('legge email, nome e identificativo oggetto', () => {
    const identita = leggiPrincipalEasyAuth(
      codifica({
        auth_typ: 'aad',
        claims: [
          {
            typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
            val: 'Domenico.Benassi@righisolutions.com',
          },
          { typ: 'name', val: 'Domenico Benassi' },
          {
            typ: 'http://schemas.microsoft.com/identity/claims/objectidentifier',
            val: 'abc-123',
          },
        ],
      }),
    );
    expect(identita).toEqual({
      email: 'domenico.benassi@righisolutions.com',
      nomeVisualizzato: 'Domenico Benassi',
      identificativoEsterno: 'abc-123',
    });
  });

  it('ripiega su preferred_username quando manca emailaddress', () => {
    const identita = leggiPrincipalEasyAuth(
      codifica({ claims: [{ typ: 'preferred_username', val: 'luca.righi@righisolutions.com' }] }),
    );
    expect(identita?.email).toBe('luca.righi@righisolutions.com');
    expect(identita?.nomeVisualizzato).toBeNull();
  });

  it('rispetta l ordine di preferenza dei claim', () => {
    const identita = leggiPrincipalEasyAuth(
      codifica({
        claims: [
          { typ: 'preferred_username', val: 'secondo@x.it' },
          {
            typ: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
            val: 'primo@x.it',
          },
        ],
      }),
    );
    expect(identita?.email).toBe('primo@x.it');
  });

  it('e nulla senza intestazione', () => {
    expect(leggiPrincipalEasyAuth(null)).toBeNull();
    expect(leggiPrincipalEasyAuth('')).toBeNull();
    expect(leggiPrincipalEasyAuth('   ')).toBeNull();
  });

  it('e nulla se non e JSON valido', () => {
    expect(leggiPrincipalEasyAuth(Buffer.from('non json', 'utf8').toString('base64'))).toBeNull();
  });

  it('e nulla senza claim', () => {
    expect(leggiPrincipalEasyAuth(codifica({ claims: [] }))).toBeNull();
    expect(leggiPrincipalEasyAuth(codifica({}))).toBeNull();
  });

  // Una identita senza indirizzo non si puo collegare a nessuna persona:
  // accettarla significherebbe far entrare qualcuno come "nessuno".
  it('e nulla senza indirizzo di posta', () => {
    expect(leggiPrincipalEasyAuth(codifica({ claims: [{ typ: 'name', val: 'Tizio' }] }))).toBeNull();
  });

  it('ignora i claim con valore vuoto', () => {
    const identita = leggiPrincipalEasyAuth(
      codifica({
        claims: [
          { typ: 'preferred_username', val: '' },
          { typ: 'upn', val: 'vero@x.it' },
        ],
      }),
    );
    expect(identita?.email).toBe('vero@x.it');
  });
});

describe('identita di sviluppo', () => {
  it('legge l indirizzo dal cookie', () => {
    expect(leggiIdentitaSviluppo('Luca.Righi%40righisolutions.com')?.email).toBe(
      'luca.righi@righisolutions.com',
    );
  });

  it('e nulla se il cookie manca o non contiene un indirizzo', () => {
    expect(leggiIdentitaSviluppo(undefined)).toBeNull();
    expect(leggiIdentitaSviluppo('')).toBeNull();
    expect(leggiIdentitaSviluppo('pippo')).toBeNull();
  });
});

describe('modalita ammessa nell ambiente', () => {
  it('easyauth e sempre ammessa', () => {
    expect(modalitaAmmessa('easyauth', { NODE_ENV: 'production' })).toBe(true);
    expect(modalitaAmmessa('easyauth', {})).toBe(true);
  });

  it('sviluppo e ammessa fuori dalla produzione', () => {
    expect(modalitaAmmessa('sviluppo', { NODE_ENV: 'development' })).toBe(true);
    expect(modalitaAmmessa('sviluppo', { NODE_ENV: 'test' })).toBe(true);
    expect(modalitaAmmessa('sviluppo', {})).toBe(true);
  });

  /**
   * Il punto della regola: la modalita sviluppo lascia scegliere qualunque
   * identita a chiunque. Metterla in esercizio per dimenticanza aprirebbe il
   * portale a chi raggiunge l'indirizzo.
   */
  it('sviluppo NON e ammessa in produzione', () => {
    expect(modalitaAmmessa('sviluppo', { NODE_ENV: 'production' })).toBe(false);
  });

  it('in produzione serve un consenso esplicito, non un valore qualunque', () => {
    expect(
      modalitaAmmessa('sviluppo', { NODE_ENV: 'production', CONSENTI_ACCESSO_SVILUPPO: 'si' }),
    ).toBe(true);
    for (const valore of ['true', '1', 'yes', 'SI', '']) {
      expect(
        modalitaAmmessa('sviluppo', {
          NODE_ENV: 'production',
          CONSENTI_ACCESSO_SVILUPPO: valore,
        }),
      ).toBe(false);
    }
  });
});
