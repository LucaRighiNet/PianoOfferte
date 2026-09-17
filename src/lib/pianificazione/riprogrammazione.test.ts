import { describe, expect, it } from 'vitest';
import { dataCivile } from '@/lib/data/dataCivile';
import {
  CalendarioLavorativo,
  type PersonaCapacita,
  type VoceIndisponibilita,
} from '@/lib/calendario/calendarioLavorativo';
import { riprogrammaCatena, type AnelloCatena } from './riprogrammazione';

const PERSONE: PersonaCapacita[] = [
  { id: 'p1', capacitaOreGiorno: 8, percentualeContratto: 100 },
  { id: 'p2', capacitaOreGiorno: 8, percentualeContratto: 100 },
];

function cal(ind: VoceIndisponibilita[] = []): CalendarioLavorativo {
  return new CalendarioLavorativo(PERSONE, ind);
}

function anello(p: Partial<AnelloCatena> & { id: string }): AnelloCatena {
  return { personaId: 'p1', stimaOre: 8, dataInizio: null, dataFine: null, ...p };
}

describe('riprogrammazione della radice', () => {
  it('sposta la radice e ne ricalcola la fine', () => {
    const e = riprogrammaCatena(
      cal(),
      { id: 'a1', personaId: 'p1', stimaOre: 12, dataFineAttuale: null },
      dataCivile('2026-09-16'),
      [],
    );
    expect(e.problemi).toEqual([]);
    expect(e.aggiornate).toEqual([
      { id: 'a1', personaId: 'p1', dataInizio: '2026-09-16', dataFine: '2026-09-17' },
    ]);
  });

  it('un inizio in giorno non lavorativo scivola al primo utile', () => {
    const e = riprogrammaCatena(
      cal(),
      { id: 'a1', personaId: 'p1', stimaOre: 8, dataFineAttuale: null },
      dataCivile('2026-09-19'), // sabato
      [],
    );
    expect(e.aggiornate[0]?.dataInizio).toBe('2026-09-21');
  });

  it('segnala il problema e si ferma se la radice non e pianificabile', () => {
    const c = cal([
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-01-01'),
        dataFine: dataCivile('2030-01-01'),
        oreGiorno: null,
      },
    ]);
    const e = riprogrammaCatena(
      c,
      { id: 'a1', personaId: 'p1', stimaOre: 8, dataFineAttuale: null },
      dataCivile('2026-09-16'),
      [anello({ id: 'a2' })],
    );
    expect(e.aggiornate).toEqual([]);
    expect(e.problemi).toHaveLength(1);
    expect(e.problemi[0]?.id).toBe('a1');
  });
});

describe('catena di successori', () => {
  it('senza margine precedente il successore parte il giorno lavorativo dopo', () => {
    const e = riprogrammaCatena(
      cal(),
      { id: 'a1', personaId: 'p1', stimaOre: 8, dataFineAttuale: null },
      dataCivile('2026-09-16'),
      [anello({ id: 'a2', stimaOre: 8 })],
    );
    expect(e.aggiornate).toEqual([
      { id: 'a1', personaId: 'p1', dataInizio: '2026-09-16', dataFine: '2026-09-16' },
      { id: 'a2', personaId: 'p1', dataInizio: '2026-09-17', dataFine: '2026-09-17' },
    ]);
  });

  it('conserva il margine di due giorni lavorativi', () => {
    // Stato attuale: radice finisce il 16, successore inizia il 21 (lunedi).
    // Fra 16 e 21 ci sono giovedi 17 e venerdi 18: due giorni lavorativi.
    const e = riprogrammaCatena(
      cal(),
      { id: 'a1', personaId: 'p1', stimaOre: 8, dataFineAttuale: dataCivile('2026-09-16') },
      dataCivile('2026-09-21'), // la radice si sposta al lunedi
      [
        anello({
          id: 'a2',
          stimaOre: 8,
          dataInizio: dataCivile('2026-09-21'),
          dataFine: dataCivile('2026-09-21'),
        }),
      ],
    );
    // Radice ora finisce il 21. Con due giorni di margine il successore parte
    // il 24 (martedi 22 e mercoledi 23 sono il margine).
    expect(e.aggiornate[0]?.dataFine).toBe('2026-09-21');
    expect(e.aggiornate[1]?.dataInizio).toBe('2026-09-24');
  });

  it('il successore non inizia mai prima della fine del predecessore', () => {
    const e = riprogrammaCatena(
      cal(),
      { id: 'a1', personaId: 'p1', stimaOre: 40, dataFineAttuale: dataCivile('2026-09-16') },
      dataCivile('2026-09-14'),
      [
        anello({
          id: 'a2',
          stimaOre: 8,
          dataInizio: dataCivile('2026-09-15'), // prima della nuova fine
          dataFine: dataCivile('2026-09-15'),
        }),
      ],
    );
    const radice = e.aggiornate[0];
    const successore = e.aggiornate[1];
    expect(radice?.dataFine).toBe('2026-09-18'); // 40 ore = una settimana
    expect(successore?.dataInizio).toBe('2026-09-21'); // lunedi dopo
  });

  it('propaga su tre anelli', () => {
    const e = riprogrammaCatena(
      cal(),
      { id: 'a1', personaId: 'p1', stimaOre: 8, dataFineAttuale: null },
      dataCivile('2026-09-16'),
      [anello({ id: 'a2', stimaOre: 8 }), anello({ id: 'a3', stimaOre: 16 })],
    );
    expect(e.aggiornate.map((a) => [a.id, a.dataInizio, a.dataFine])).toEqual([
      ['a1', '2026-09-16', '2026-09-16'],
      ['a2', '2026-09-17', '2026-09-17'],
      ['a3', '2026-09-18', '2026-09-21'], // scavalca il weekend
    ]);
  });

  it('usa il calendario della persona del successore, non della radice', () => {
    const c = cal([
      {
        personaId: 'p2',
        dataInizio: dataCivile('2026-09-17'),
        dataFine: dataCivile('2026-09-18'),
        oreGiorno: null,
      },
    ]);
    const e = riprogrammaCatena(
      c,
      { id: 'a1', personaId: 'p1', stimaOre: 8, dataFineAttuale: null },
      dataCivile('2026-09-16'),
      [anello({ id: 'a2', personaId: 'p2', stimaOre: 8 })],
    );
    // p2 e in ferie il 17 e 18: parte lunedi 21.
    expect(e.aggiornate[1]?.dataInizio).toBe('2026-09-21');
  });

  it('si ferma su un successore non assegnato senza toccare quelli dopo', () => {
    const e = riprogrammaCatena(
      cal(),
      { id: 'a1', personaId: 'p1', stimaOre: 8, dataFineAttuale: null },
      dataCivile('2026-09-16'),
      [anello({ id: 'a2', personaId: null }), anello({ id: 'a3' })],
    );
    expect(e.aggiornate.map((a) => a.id)).toEqual(['a1']);
    expect(e.problemi).toHaveLength(1);
    expect(e.problemi[0]?.id).toBe('a2');
  });

  it('non lascia mai sovrapposizioni fra anelli consecutivi', () => {
    const e = riprogrammaCatena(
      cal(),
      { id: 'a1', personaId: 'p1', stimaOre: 20, dataFineAttuale: null },
      dataCivile('2026-09-14'),
      [
        anello({ id: 'a2', stimaOre: 20 }),
        anello({ id: 'a3', stimaOre: 4 }),
        anello({ id: 'a4', stimaOre: 12 }),
      ],
    );
    expect(e.problemi).toEqual([]);
    for (let i = 1; i < e.aggiornate.length; i += 1) {
      const precedente = e.aggiornate[i - 1];
      const corrente = e.aggiornate[i];
      expect(corrente!.dataInizio > precedente!.dataFine).toBe(true);
    }
  });

  it('le ore di ogni anello restano quelle richieste', () => {
    const c = cal();
    const e = riprogrammaCatena(
      c,
      { id: 'a1', personaId: 'p1', stimaOre: 12, dataFineAttuale: null },
      dataCivile('2026-09-16'),
      [anello({ id: 'a2', stimaOre: 6 })],
    );
    const oreRadice = c
      .espandiDurata('p1', dataCivile(e.aggiornate[0]!.dataInizio), 12)
      .ripartizione.reduce((s, r) => s + r.ore, 0);
    expect(oreRadice).toBe(12);
  });
});

describe('guardia sullo scostamento', () => {
  /**
   * Il caso trovato sui dati di prova: una persona il cui carico non-offerta
   * assorbe tutte le ore ha capacita netta zero. Senza guardia il lavoro veniva
   * collocato dieci mesi dopo, in silenzio, e spariva dalla vista.
   */
  it('rifiuta di collocare il lavoro troppo lontano dalla data richiesta', () => {
    const c = new CalendarioLavorativo(PERSONE, [
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-01'),
        dataFine: dataCivile('2027-06-30'),
        oreGiorno: null,
      },
    ]);
    const e = riprogrammaCatena(
      c,
      { id: 'a1', personaId: 'p1', stimaOre: 8, dataFineAttuale: null },
      dataCivile('2026-09-16'),
      [],
    );
    expect(e.aggiornate).toEqual([]);
    expect(e.problemi).toHaveLength(1);
    expect(e.problemi[0]?.motivo).toContain('non ha capacita disponibile prima del');
    expect(e.problemi[0]?.motivo).toContain('2027-07-01');
  });

  it('uno slittamento breve resta ammesso', () => {
    const c = new CalendarioLavorativo(PERSONE, [
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-16'),
        dataFine: dataCivile('2026-09-30'),
        oreGiorno: null,
      },
    ]);
    const e = riprogrammaCatena(
      c,
      { id: 'a1', personaId: 'p1', stimaOre: 8, dataFineAttuale: null },
      dataCivile('2026-09-16'),
      [],
    );
    expect(e.problemi).toEqual([]);
    expect(e.aggiornate[0]?.dataInizio).toBe('2026-10-01');
  });

  it('la soglia e configurabile', () => {
    const c = new CalendarioLavorativo(PERSONE, [
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-16'),
        dataFine: dataCivile('2026-09-30'),
        oreGiorno: null,
      },
    ]);
    const e = riprogrammaCatena(
      c,
      { id: 'a1', personaId: 'p1', stimaOre: 8, dataFineAttuale: null },
      dataCivile('2026-09-16'),
      [],
      5,
    );
    expect(e.aggiornate).toEqual([]);
    expect(e.problemi).toHaveLength(1);
  });
});
