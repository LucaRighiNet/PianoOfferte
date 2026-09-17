import { describe, expect, it } from 'vitest';
import { dataCivile } from '@/lib/data/dataCivile';
import type { AttivitaVista, OffertaVista, PersonaVista } from '@/lib/query/piano';
import { costruisciGruppi } from './raggruppamento';

const PERSONE: PersonaVista[] = [
  {
    id: 'p1', nome: 'Domenico', cognome: 'Benassi', iniziali: 'DB', ruolo: 'OPERATORE',
    colore: '#0d9488', capacitaOreGiorno: 8, percentualeContratto: 100, limiteWip: 5,
  },
  {
    id: 'p2', nome: 'Chiara', cognome: 'Zoli', iniziali: 'CZ', ruolo: 'OPERATORE',
    colore: '#14b8a6', capacitaOreGiorno: 4, percentualeContratto: 50, limiteWip: 4,
  },
];

function offerta(id: string, p: Partial<OffertaVista> = {}): OffertaVista {
  return {
    id, codice: `OF${id}`, descrizione: `Offerta ${id}`, colore: '#0ea5e9',
    clienteId: 'c1', cliente: 'Cummins', kamId: 'k1', kam: 'Luca Righi', kamIniziali: 'LR',
    dataRichiesta: dataCivile('2026-09-01'), dataScadenzaCliente: dataCivile('2026-09-30'),
    stato: 'PIANIFICATA', priorita: 'NORMALE', ...p,
  };
}

function attivita(id: string, p: Partial<AttivitaVista> = {}): AttivitaVista {
  return {
    id, offertaId: 'o1', tipoAttivitaId: 't1', tipoAttivita: 'Sviluppo offerta',
    personaId: 'p1', stimaOre: 8, dataInizio: dataCivile('2026-09-16'),
    dataFine: dataCivile('2026-09-16'), stato: 'IN_CORSO', causaleBlocco: null,
    iniziataIl: null, ordine: 0, versione: 0, ...p,
  };
}

describe('raggruppamento per risorsa', () => {
  it('crea una riga per ogni persona attiva, anche senza lavoro', () => {
    const g = costruisciGruppi({
      attivita: [attivita('a1')],
      offerte: new Map([['o1', offerta('o1')]]),
      persone: PERSONE,
      modo: 'RISORSA',
    });
    expect(g).toHaveLength(2);
    expect(g[0]?.titolo).toBe('Benassi Domenico');
    expect(g[0]?.attivita).toHaveLength(1);
    // La persona senza lavoro resta visibile: e il caso che interessa al responsabile.
    expect(g[1]?.titolo).toBe('Zoli Chiara');
    expect(g[1]?.attivita).toHaveLength(0);
  });

  it('valorizza personaId, che abilita la riga di capacita', () => {
    const g = costruisciGruppi({
      attivita: [], offerte: new Map(), persone: PERSONE, modo: 'RISORSA',
    });
    expect(g.every((x) => x.personaId !== null)).toBe(true);
  });

  it('non assegna le attivita non assegnate a nessuna corsia', () => {
    const g = costruisciGruppi({
      attivita: [attivita('a1', { personaId: null })],
      offerte: new Map([['o1', offerta('o1')]]),
      persone: PERSONE,
      modo: 'RISORSA',
    });
    expect(g.every((x) => x.attivita.length === 0)).toBe(true);
  });

  it('segnala la capacita ridotta nell etichetta', () => {
    const g = costruisciGruppi({
      attivita: [], offerte: new Map(), persone: PERSONE, modo: 'RISORSA',
    });
    expect(g[1]?.etichette[0]?.titolo).toContain('contratto 50%');
  });
});

describe('raggruppamento per offerta', () => {
  it('ordina per prima data di inizio', () => {
    const g = costruisciGruppi({
      attivita: [
        attivita('a1', { offertaId: 'o1', dataInizio: dataCivile('2026-09-20') }),
        attivita('a2', { offertaId: 'o2', dataInizio: dataCivile('2026-09-14') }),
      ],
      offerte: new Map([
        ['o1', offerta('o1')],
        ['o2', offerta('o2')],
      ]),
      persone: PERSONE,
      modo: 'OFFERTA',
    });
    expect(g.map((x) => x.chiave)).toEqual(['offerta:o2', 'offerta:o1']);
  });

  it('non ha riga di capacita', () => {
    const g = costruisciGruppi({
      attivita: [attivita('a1')],
      offerte: new Map([['o1', offerta('o1')]]),
      persone: PERSONE,
      modo: 'OFFERTA',
    });
    expect(g[0]?.personaId).toBeNull();
  });

  it('ignora le attivita di offerte non caricate invece di andare in errore', () => {
    const g = costruisciGruppi({
      attivita: [attivita('a1', { offertaId: 'fantasma' })],
      offerte: new Map(),
      persone: PERSONE,
      modo: 'OFFERTA',
    });
    expect(g).toEqual([]);
  });
});

describe('raggruppamento per cliente e KAM', () => {
  it('raggruppa per cliente e conta offerte distinte', () => {
    const g = costruisciGruppi({
      attivita: [
        attivita('a1', { offertaId: 'o1' }),
        attivita('a2', { offertaId: 'o2' }),
        attivita('a3', { offertaId: 'o2' }),
      ],
      offerte: new Map([
        ['o1', offerta('o1', { clienteId: 'c1', cliente: 'Cummins' })],
        ['o2', offerta('o2', { clienteId: 'c1', cliente: 'Cummins' })],
      ]),
      persone: PERSONE,
      modo: 'CLIENTE',
    });
    expect(g).toHaveLength(1);
    expect(g[0]?.titolo).toBe('Cummins');
    expect(g[0]?.etichette[0]?.testo).toBe('2 off.');
    expect(g[0]?.etichette[1]?.testo).toBe('3 att.');
  });

  it('raggruppa per KAM in ordine alfabetico', () => {
    const g = costruisciGruppi({
      attivita: [
        attivita('a1', { offertaId: 'o1' }),
        attivita('a2', { offertaId: 'o2' }),
      ],
      offerte: new Map([
        ['o1', offerta('o1', { kamId: 'k2', kam: 'Zoli Chiara', kamIniziali: 'ZC' })],
        ['o2', offerta('o2', { kamId: 'k1', kam: 'Camera Fabio', kamIniziali: 'CF' })],
      ]),
      persone: PERSONE,
      modo: 'KAM',
    });
    expect(g.map((x) => x.titolo)).toEqual(['Camera Fabio', 'Zoli Chiara']);
  });

  it('salta le offerte senza KAM invece di creare un gruppo vuoto', () => {
    const g = costruisciGruppi({
      attivita: [attivita('a1', { offertaId: 'o1' })],
      offerte: new Map([['o1', offerta('o1', { kamId: null, kam: null, kamIniziali: null })]]),
      persone: PERSONE,
      modo: 'KAM',
    });
    expect(g).toEqual([]);
  });
});

describe('indicatore del lavoro in corso', () => {
  function att2(id: string, p: Partial<AttivitaVista> = {}): AttivitaVista {
    return attivita(id, p);
  }

  it('non mostra nulla se il limite non e superato', () => {
    const g = costruisciGruppi({
      attivita: [],
      offerte: new Map([['o1', offerta('o1')]]),
      persone: PERSONE,
      modo: 'RISORSA',
      tutteLeAttivita: [att2('a1', { stato: 'IN_CORSO' })],
    });
    expect(g[0]?.etichette).toHaveLength(1);
  });

  it('segnala il superamento contando in corso e bloccate', () => {
    // PERSONE[0] ha limiteWip 5: sei aperte lo superano.
    const aperte = [
      att2('a1', { stato: 'IN_CORSO' }),
      att2('a2', { stato: 'IN_CORSO' }),
      att2('a3', { stato: 'BLOCCATA' }),
      att2('a4', { stato: 'IN_CORSO' }),
      att2('a5', { stato: 'BLOCCATA' }),
      att2('a6', { stato: 'IN_CORSO' }),
    ];
    const g = costruisciGruppi({
      attivita: [],
      offerte: new Map([['o1', offerta('o1')]]),
      persone: PERSONE,
      modo: 'RISORSA',
      tutteLeAttivita: aperte,
    });
    const allarme = g[0]?.etichette.find((e) => e.allarme === true);
    expect(allarme?.testo).toBe('WIP 6/5');
  });

  it('non conta le completate ne le non iniziate', () => {
    const g = costruisciGruppi({
      attivita: [],
      offerte: new Map([['o1', offerta('o1')]]),
      persone: PERSONE,
      modo: 'RISORSA',
      tutteLeAttivita: [
        att2('a1', { stato: 'COMPLETATA' }),
        att2('a2', { stato: 'NON_INIZIATA' }),
        att2('a3', { stato: 'COMPLETATA' }),
        att2('a4', { stato: 'COMPLETATA' }),
        att2('a5', { stato: 'COMPLETATA' }),
        att2('a6', { stato: 'COMPLETATA' }),
        att2('a7', { stato: 'COMPLETATA' }),
      ],
    });
    expect(g[0]?.etichette.some((e) => e.allarme === true)).toBe(false);
  });

  it('conta sul lavoro totale, non su quello filtrato', () => {
    // Il conteggio non deve dipendere da cosa e visibile a schermo.
    const aperte = Array.from({ length: 6 }, (_, i) =>
      att2(`a${i}`, { stato: 'IN_CORSO' }),
    );
    const g = costruisciGruppi({
      attivita: [],
      offerte: new Map([['o1', offerta('o1')]]),
      persone: PERSONE,
      modo: 'RISORSA',
      tutteLeAttivita: aperte,
    });
    expect(g[0]?.etichette.some((e) => e.allarme === true)).toBe(true);
  });
});
