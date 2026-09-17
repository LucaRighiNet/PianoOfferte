import { describe, expect, it } from 'vitest';
import { dataCivile } from '@/lib/data/dataCivile';
import {
  digestPersonale,
  digestResponsabile,
  type AttivitaNotificabile,
  type DestinatarioDigest,
} from './contenuti';

const OGGI = dataCivile('2026-09-17');

const IO: DestinatarioDigest = {
  personaId: 'p1',
  email: 'domenico.benassi@righisolutions.com',
  nome: 'Domenico',
  ruolo: 'OPERATORE',
};

function att(p: Partial<AttivitaNotificabile> & { id: string }): AttivitaNotificabile {
  return {
    personaId: 'p1',
    cliente: 'Cummins',
    descrizioneOfferta: 'Quadri elettrici BT',
    tipoAttivita: 'Sviluppo offerta',
    dataInizio: dataCivile('2026-09-17'),
    dataFine: dataCivile('2026-09-18'),
    stato: 'IN_CORSO',
    causaleBlocco: null,
    scadenzaCliente: null,
    ...p,
  };
}

describe('digest personale', () => {
  // Il punto piu importante: chi non ha nulla da fare non viene disturbato.
  it('e nullo quando non c e niente da dire', () => {
    expect(digestPersonale(IO, [att({ id: 'a1' })], OGGI)).toBeNull();
  });

  it('e nullo se non ci sono attivita', () => {
    expect(digestPersonale(IO, [], OGGI)).toBeNull();
  });

  it('non riporta il lavoro di altri', () => {
    const d = digestPersonale(
      IO,
      [att({ id: 'a1', personaId: 'p2', dataFine: dataCivile('2026-09-10') })],
      OGGI,
    );
    expect(d).toBeNull();
  });

  it('ignora le completate, anche se in ritardo', () => {
    const d = digestPersonale(
      IO,
      [att({ id: 'a1', stato: 'COMPLETATA', dataFine: dataCivile('2026-09-01') })],
      OGGI,
    );
    expect(d).toBeNull();
  });

  it('segnala il ritardo con il numero di giorni', () => {
    const d = digestPersonale(
      IO,
      [att({ id: 'a1', dataFine: dataCivile('2026-09-14') })],
      OGGI,
    );
    expect(d?.voci).toHaveLength(1);
    expect(d?.voci[0]?.motivo).toBe('IN_RITARDO');
    expect(d?.voci[0]?.testo).toContain('3 giorni');
    expect(d?.voci[0]?.testo).toContain('Cummins');
    expect(d?.oggetto).toBe('Offerte: 1 in ritardo');
  });

  it('usa il singolare per un giorno solo', () => {
    const d = digestPersonale(
      IO,
      [att({ id: 'a1', dataFine: dataCivile('2026-09-16') })],
      OGGI,
    );
    expect(d?.voci[0]?.testo).toContain('1 giorno:');
  });

  it('segnala le bloccate con la causale in chiaro', () => {
    const d = digestPersonale(
      IO,
      [att({ id: 'a1', stato: 'BLOCCATA', causaleBlocco: 'ATTESA_DATO_CLIENTE' })],
      OGGI,
    );
    expect(d?.voci[0]?.testo).toContain('in attesa di un dato dal cliente');
  });

  it('segnala cio che inizia oggi ed e ancora da iniziare', () => {
    const d = digestPersonale(
      IO,
      [att({ id: 'a1', stato: 'NON_INIZIATA', dataFine: dataCivile('2026-09-20') })],
      OGGI,
    );
    expect(d?.voci[0]?.motivo).toBe('INIZIA_OGGI');
  });

  it('non segnala cio che inizia oggi se e gia in corso', () => {
    const d = digestPersonale(
      IO,
      [att({ id: 'a1', stato: 'IN_CORSO', dataFine: dataCivile('2026-09-20') })],
      OGGI,
    );
    expect(d).toBeNull();
  });

  it('segnala la scadenza cliente entro tre giorni', () => {
    const d = digestPersonale(
      IO,
      [
        att({
          id: 'a1',
          dataFine: dataCivile('2026-09-20'),
          scadenzaCliente: dataCivile('2026-09-19'),
        }),
      ],
      OGGI,
    );
    expect(d?.voci.some((v) => v.motivo === 'SCADENZA_VICINA')).toBe(true);
  });

  it('non segnala una scadenza lontana', () => {
    const d = digestPersonale(
      IO,
      [
        att({
          id: 'a1',
          dataFine: dataCivile('2026-09-20'),
          scadenzaCliente: dataCivile('2026-10-30'),
        }),
      ],
      OGGI,
    );
    expect(d).toBeNull();
  });

  it('il corpo nomina il destinatario ed elenca le voci', () => {
    const d = digestPersonale(
      IO,
      [att({ id: 'a1', dataFine: dataCivile('2026-09-14') })],
      OGGI,
    );
    expect(d?.corpo).toContain('Ciao Domenico');
    expect(d?.corpo).toContain('- In ritardo');
  });
});

describe('digest del responsabile', () => {
  const CAPO: DestinatarioDigest = {
    personaId: 'p9',
    email: 'luca.righi@righisolutions.com',
    nome: 'Luca',
    ruolo: 'RESPONSABILE',
  };

  it('e nullo quando non c e niente da decidere', () => {
    expect(
      digestResponsabile(CAPO, {
        daAssegnare: 0,
        personeInSovraccarico: [],
        offerteSforate: [],
      }),
    ).toBeNull();
  });

  it('mette per prime le offerte sforate', () => {
    const d = digestResponsabile(CAPO, {
      daAssegnare: 4,
      personeInSovraccarico: ['Zoli Chiara'],
      offerteSforate: ['Cummins OF001'],
    });
    expect(d?.voci[0]?.testo).toContain('oltre la scadenza');
    expect(d?.voci).toHaveLength(3);
  });

  it('tronca l elenco delle sforate a cinque', () => {
    const d = digestResponsabile(CAPO, {
      daAssegnare: 0,
      personeInSovraccarico: [],
      offerteSforate: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    });
    expect(d?.voci[0]?.testo).toContain('7 offerte oltre la scadenza');
    expect(d?.voci[0]?.testo.split(';')).toHaveLength(5);
  });
});
