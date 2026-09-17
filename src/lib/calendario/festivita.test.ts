import { describe, expect, it } from 'vitest';
import { dataCivile } from '@/lib/data/dataCivile';
import {
  domenicaDiPasqua,
  festivitaItaliane,
  indiceFestivita,
  lunediDellAngelo,
} from './festivita';

describe('Pasqua', () => {
  // Date verificabili su qualsiasi calendario: servono a bloccare l'algoritmo.
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2028, '2028-04-16'],
    [2030, '2030-04-21'],
    [2038, '2038-04-25'],
  ])('Pasqua %i cade il %s', (anno, atteso) => {
    expect(domenicaDiPasqua(anno)).toBe(atteso);
  });

  it('il Lunedi dell Angelo e il giorno dopo Pasqua, anche a cavallo di mese', () => {
    expect(lunediDellAngelo(2026)).toBe('2026-04-06');
    // Pasqua 2024 e il 31 marzo: il lunedi cade in aprile.
    expect(lunediDellAngelo(2024)).toBe('2024-04-01');
  });
});

describe('festivita italiane', () => {
  it('contiene le undici ricorrenze civili', () => {
    expect(festivitaItaliane(2026).size).toBe(11);
  });

  it('include le fisse principali', () => {
    const f = festivitaItaliane(2026);
    expect(f.get(dataCivile('2026-01-01'))).toBe('Capodanno');
    expect(f.get(dataCivile('2026-08-15'))).toBe('Ferragosto');
    expect(f.get(dataCivile('2026-12-25'))).toBe('Natale');
    expect(f.get(dataCivile('2026-04-06'))).toBe("Lunedi dell'Angelo");
  });

  it('non include il patrono, che e una chiusura configurabile', () => {
    const f = festivitaItaliane(2026);
    expect(f.has(dataCivile('2026-10-04'))).toBe(false); // San Petronio, Bologna
  });

  it('e ordinata per data', () => {
    const chiavi = [...festivitaItaliane(2026).keys()];
    expect(chiavi).toEqual([...chiavi].sort());
  });

  it('l indice copre piu anni', () => {
    const idx = indiceFestivita(2025, 2027);
    expect(idx.size).toBe(33);
    expect(idx.has(dataCivile('2025-04-21'))).toBe(true);
    expect(idx.has(dataCivile('2027-03-29'))).toBe(true);
  });
});
