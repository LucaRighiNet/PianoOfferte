import { describe, expect, it } from 'vitest';
import { dataCivile } from '@/lib/data/dataCivile';
import {
  CalendarioLavorativo,
  type PersonaCapacita,
  type VoceIndisponibilita,
} from '@/lib/calendario/calendarioLavorativo';
import {
  aggregaCarico,
  allocazionePerPersona,
  caricoGiornaliero,
  fasciaDa,
  ripartisciSuFinestra,
  SOGLIE_PREDEFINITE,
  type AttivitaAllocabile,
} from './saturazione';

const PERSONE: PersonaCapacita[] = [
  { id: 'p1', capacitaOreGiorno: 8, percentualeContratto: 100 },
  { id: 'p2', capacitaOreGiorno: 8, percentualeContratto: 50 },
];

function cal(ind: VoceIndisponibilita[] = []): CalendarioLavorativo {
  return new CalendarioLavorativo(PERSONE, ind);
}

describe('fasce di carico', () => {
  it('applica le soglie del piano', () => {
    expect(fasciaDa(0, 8)).toBe('SCARICO');
    expect(fasciaDa(3.2, 8)).toBe('SCARICO'); // 40%
    expect(fasciaDa(3.3, 8)).toBe('SANO'); // 41,25%
    expect(fasciaDa(6.8, 8)).toBe('SANO'); // 85%
    expect(fasciaDa(7, 8)).toBe('PIENO'); // 87,5%
    expect(fasciaDa(8, 8)).toBe('PIENO'); // 100%
    expect(fasciaDa(9, 8)).toBe('SOVRACCARICO');
  });

  it('un giorno senza capacita e senza lavoro non e sovraccarico', () => {
    expect(fasciaDa(0, 0)).toBe('NON_LAVORATIVO');
  });

  it('lavoro su un giorno senza capacita e sempre sovraccarico', () => {
    expect(fasciaDa(1, 0)).toBe('SOVRACCARICO');
  });

  it('accetta soglie personalizzate', () => {
    const strette = { scaricoFinoA: 20, sanoFinoA: 60, pienoFinoA: 90 };
    expect(fasciaDa(4, 8, strette)).toBe('SANO'); // 50%
    expect(fasciaDa(6, 8, strette)).toBe('PIENO'); // 75%
    expect(fasciaDa(7.5, 8, strette)).toBe('SOVRACCARICO'); // 93,75%
  });
});

describe('ripartizione sulla finestra', () => {
  it('una attivita di un giorno resta su quel giorno', () => {
    const q = ripartisciSuFinestra(
      cal(),
      'p1',
      dataCivile('2026-09-16'),
      dataCivile('2026-09-16'),
      8,
    );
    expect([...q]).toEqual([['2026-09-16', 8]]);
  });

  it('una barra stirata distribuisce le ore piu sottili', () => {
    // 8 ore stese su lunedi-venerdi: 1,6 ore al giorno.
    const q = ripartisciSuFinestra(
      cal(),
      'p1',
      dataCivile('2026-09-14'),
      dataCivile('2026-09-18'),
      8,
    );
    expect(q.size).toBe(5);
    expect([...q.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(8, 2);
  });

  it('non assegna ore a weekend e festivita', () => {
    const q = ripartisciSuFinestra(
      cal(),
      'p1',
      dataCivile('2026-09-18'),
      dataCivile('2026-09-21'),
      16,
    );
    expect([...q.keys()]).toEqual(['2026-09-18', '2026-09-21']);
  });

  it('la somma torna esatta anche con divisioni non intere', () => {
    const q = ripartisciSuFinestra(
      cal(),
      'p1',
      dataCivile('2026-09-14'),
      dataCivile('2026-09-16'),
      10,
    );
    const somma = [...q.values()].reduce((a, b) => a + b, 0);
    expect(Math.round(somma * 100) / 100).toBe(10);
  });

  it('se la finestra non ha capacita le ore restano visibili sul primo giorno', () => {
    // Sabato-domenica: nessuna capacita, ma il carico non deve sparire.
    const q = ripartisciSuFinestra(
      cal(),
      'p1',
      dataCivile('2026-09-19'),
      dataCivile('2026-09-20'),
      6,
    );
    expect([...q]).toEqual([['2026-09-19', 6]]);
  });

  it('ignora ore non positive', () => {
    const q = ripartisciSuFinestra(
      cal(),
      'p1',
      dataCivile('2026-09-16'),
      dataCivile('2026-09-16'),
      0,
    );
    expect(q.size).toBe(0);
  });

  it('restituisce vuoto se la finestra e invertita', () => {
    const q = ripartisciSuFinestra(
      cal(),
      'p1',
      dataCivile('2026-09-18'),
      dataCivile('2026-09-16'),
      8,
    );
    expect(q.size).toBe(0);
  });
});

describe('allocazione per persona', () => {
  const attivita: AttivitaAllocabile[] = [
    {
      id: 'a1',
      personaId: 'p1',
      dataInizio: dataCivile('2026-09-16'),
      dataFine: dataCivile('2026-09-16'),
      stimaOre: 4,
    },
    {
      id: 'a2',
      personaId: 'p1',
      dataInizio: dataCivile('2026-09-16'),
      dataFine: dataCivile('2026-09-16'),
      stimaOre: 6,
    },
    {
      id: 'a3',
      personaId: 'p2',
      dataInizio: dataCivile('2026-09-16'),
      dataFine: dataCivile('2026-09-16'),
      stimaOre: 2,
    },
  ];

  it('somma le attivita sovrapposte della stessa persona', () => {
    const alloc = allocazionePerPersona(cal(), attivita);
    expect(alloc.get('p1')?.get(dataCivile('2026-09-16'))).toBe(10);
    expect(alloc.get('p2')?.get(dataCivile('2026-09-16'))).toBe(2);
  });

  it('ignora le attivita non assegnate, che stanno nella coda Da assegnare', () => {
    const alloc = allocazionePerPersona(cal(), [
      ...attivita,
      {
        id: 'a4',
        personaId: null,
        dataInizio: dataCivile('2026-09-16'),
        dataFine: dataCivile('2026-09-16'),
        stimaOre: 40,
      },
    ]);
    expect(alloc.get('p1')?.get(dataCivile('2026-09-16'))).toBe(10);
    expect(alloc.size).toBe(2);
  });

  it('ignora le attivita senza date', () => {
    const alloc = allocazionePerPersona(cal(), [
      { id: 'a5', personaId: 'p1', dataInizio: null, dataFine: null, stimaOre: 8 },
    ]);
    expect(alloc.size).toBe(0);
  });
});

describe('carico giornaliero', () => {
  it('produce percentuale e fascia per ogni giorno', () => {
    const c = cal();
    const alloc = allocazionePerPersona(c, [
      {
        id: 'a1',
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-16'),
        dataFine: dataCivile('2026-09-16'),
        stimaOre: 10,
      },
    ]);
    const carico = caricoGiornaliero(
      c,
      'p1',
      dataCivile('2026-09-14'),
      dataCivile('2026-09-20'),
      alloc.get('p1'),
    );
    expect(carico).toHaveLength(7);

    const mercoledi = carico.find((g) => g.giorno === '2026-09-16');
    expect(mercoledi?.oreAllocate).toBe(10);
    expect(mercoledi?.oreDisponibili).toBe(8);
    expect(mercoledi?.percentuale).toBe(125);
    expect(mercoledi?.fascia).toBe('SOVRACCARICO');

    const sabato = carico.find((g) => g.giorno === '2026-09-19');
    expect(sabato?.percentuale).toBeNull();
    expect(sabato?.fascia).toBe('NON_LAVORATIVO');

    const lunedi = carico.find((g) => g.giorno === '2026-09-14');
    expect(lunedi?.oreAllocate).toBe(0);
    expect(lunedi?.fascia).toBe('SCARICO');
  });

  it('funziona anche senza allocazione', () => {
    const carico = caricoGiornaliero(
      cal(),
      'p1',
      dataCivile('2026-09-14'),
      dataCivile('2026-09-15'),
      undefined,
    );
    expect(carico.every((g) => g.oreAllocate === 0)).toBe(true);
  });
});

describe('aggregazione settimanale', () => {
  it('somma il carico della settimana e ricalcola la fascia', () => {
    const c = cal();
    const alloc = allocazionePerPersona(c, [
      {
        id: 'a1',
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-14'),
        dataFine: dataCivile('2026-09-18'),
        stimaOre: 36,
      },
    ]);
    const settimana = aggregaCarico(
      caricoGiornaliero(
        c,
        'p1',
        dataCivile('2026-09-14'),
        dataCivile('2026-09-20'),
        alloc.get('p1'),
      ),
    );
    expect(settimana.oreDisponibili).toBe(40);
    expect(settimana.oreAllocate).toBe(36);
    expect(settimana.percentuale).toBe(90);
    expect(settimana.fascia).toBe('PIENO');
  });

  it('una settimana interamente di ferie non e sovraccarico se non c e lavoro', () => {
    const c = cal([
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-14'),
        dataFine: dataCivile('2026-09-20'),
        oreGiorno: null,
      },
    ]);
    const settimana = aggregaCarico(
      caricoGiornaliero(c, 'p1', dataCivile('2026-09-14'), dataCivile('2026-09-20'), undefined),
    );
    expect(settimana.oreDisponibili).toBe(0);
    expect(settimana.percentuale).toBeNull();
    expect(settimana.fascia).toBe('NON_LAVORATIVO');
  });

  it('le soglie predefinite sono quelle del piano', () => {
    expect(SOGLIE_PREDEFINITE).toEqual({ scaricoFinoA: 40, sanoFinoA: 85, pienoFinoA: 100 });
  });
});

describe('persone fuori dal calendario', () => {
  it('ignora le attivita di chi non e nel calendario, senza sollevare eccezione', () => {
    const c = cal();
    const alloc = allocazionePerPersona(c, [
      {
        id: 'a1',
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-16'),
        dataFine: dataCivile('2026-09-16'),
        stimaOre: 4,
      },
      {
        id: 'a2',
        personaId: 'sconosciuta',
        dataInizio: dataCivile('2026-09-16'),
        dataFine: dataCivile('2026-09-16'),
        stimaOre: 8,
      },
    ]);
    expect(alloc.size).toBe(1);
    expect(alloc.get('p1')?.get(dataCivile('2026-09-16'))).toBe(4);
  });
});
