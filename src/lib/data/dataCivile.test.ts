import { describe, expect, it } from 'vitest';
import {
  aggiungiGiorni,
  confronta,
  daIstante,
  dataCivile,
  DataCivileNonValida,
  differenzaGiorni,
  eDataCivile,
  eWeekend,
  giorniNelMese,
  giorniTra,
  giornoSettimanaIso,
  inizioSettimana,
  massimo,
  minimo,
  settimanaIso,
} from './dataCivile';

describe('dataCivile', () => {
  it('accetta una data valida', () => {
    expect(dataCivile('2026-09-16')).toBe('2026-09-16');
  });

  it('rifiuta formati errati', () => {
    expect(() => dataCivile('16/09/2026')).toThrow(DataCivileNonValida);
    expect(() => dataCivile('2026-9-16')).toThrow(DataCivileNonValida);
    expect(() => dataCivile('')).toThrow(DataCivileNonValida);
  });

  it('rifiuta giorni inesistenti invece di normalizzarli', () => {
    expect(() => dataCivile('2026-02-30')).toThrow(DataCivileNonValida);
    expect(() => dataCivile('2026-13-01')).toThrow(DataCivileNonValida);
    expect(() => dataCivile('2025-02-29')).toThrow(DataCivileNonValida);
  });

  it('accetta il 29 febbraio negli anni bisestili', () => {
    expect(dataCivile('2024-02-29')).toBe('2024-02-29');
  });

  it('eDataCivile non solleva eccezioni', () => {
    expect(eDataCivile('2026-09-16')).toBe(true);
    expect(eDataCivile('non-una-data')).toBe(false);
  });
});

describe('aritmetica', () => {
  it('somma giorni attraversando il cambio di mese', () => {
    expect(aggiungiGiorni(dataCivile('2026-08-31'), 1)).toBe('2026-09-01');
    expect(aggiungiGiorni(dataCivile('2026-12-31'), 1)).toBe('2027-01-01');
  });

  it('sottrae giorni', () => {
    expect(aggiungiGiorni(dataCivile('2026-01-01'), -1)).toBe('2025-12-31');
  });

  // Il caso che rompe le implementazioni basate su Date locale: in Europe/Rome
  // l'ora legale finisce il 25 ottobre 2026 e inizia il 29 marzo 2026.
  it('non perde ne guadagna giorni ai cambi di ora legale', () => {
    expect(aggiungiGiorni(dataCivile('2026-03-28'), 1)).toBe('2026-03-29');
    expect(aggiungiGiorni(dataCivile('2026-03-29'), 1)).toBe('2026-03-30');
    expect(aggiungiGiorni(dataCivile('2026-10-24'), 1)).toBe('2026-10-25');
    expect(aggiungiGiorni(dataCivile('2026-10-25'), 1)).toBe('2026-10-26');
    expect(differenzaGiorni(dataCivile('2026-03-30'), dataCivile('2026-03-28'))).toBe(2);
    expect(differenzaGiorni(dataCivile('2026-10-26'), dataCivile('2026-10-24'))).toBe(2);
  });

  it('calcola la differenza in giorni con segno', () => {
    expect(differenzaGiorni(dataCivile('2026-09-16'), dataCivile('2026-09-16'))).toBe(0);
    expect(differenzaGiorni(dataCivile('2026-09-17'), dataCivile('2026-09-16'))).toBe(1);
    expect(differenzaGiorni(dataCivile('2026-09-15'), dataCivile('2026-09-16'))).toBe(-1);
    expect(differenzaGiorni(dataCivile('2027-01-01'), dataCivile('2026-01-01'))).toBe(365);
  });

  it('ordina, minimo e massimo', () => {
    const a = dataCivile('2026-09-16');
    const b = dataCivile('2026-09-20');
    expect(confronta(a, b)).toBe(-1);
    expect(confronta(b, a)).toBe(1);
    expect(confronta(a, a)).toBe(0);
    expect(minimo(a, b)).toBe(a);
    expect(massimo(a, b)).toBe(b);
  });
});

describe('settimana ISO', () => {
  it('lunedi e 1, domenica e 7', () => {
    expect(giornoSettimanaIso(dataCivile('2026-09-14'))).toBe(1);
    expect(giornoSettimanaIso(dataCivile('2026-09-20'))).toBe(7);
  });

  it('riconosce il weekend', () => {
    expect(eWeekend(dataCivile('2026-09-18'))).toBe(false);
    expect(eWeekend(dataCivile('2026-09-19'))).toBe(true);
    expect(eWeekend(dataCivile('2026-09-20'))).toBe(true);
  });

  // Coerenza con le etichette W35-W39 visibili nello screenshot del beta:
  // il 24 agosto 2026 e lunedi della settimana 35.
  it('riproduce le settimane dello screenshot', () => {
    expect(settimanaIso(dataCivile('2026-08-24'))).toEqual({ anno: 2026, settimana: 35 });
    expect(settimanaIso(dataCivile('2026-08-31'))).toEqual({ anno: 2026, settimana: 36 });
    expect(settimanaIso(dataCivile('2026-09-07'))).toEqual({ anno: 2026, settimana: 37 });
    expect(settimanaIso(dataCivile('2026-09-14'))).toEqual({ anno: 2026, settimana: 38 });
    expect(settimanaIso(dataCivile('2026-09-21'))).toEqual({ anno: 2026, settimana: 39 });
  });

  it('gestisce le settimane a cavallo d anno', () => {
    // Il 1 gennaio 2027 e venerdi: settimana 53 del 2026.
    expect(settimanaIso(dataCivile('2027-01-01'))).toEqual({ anno: 2026, settimana: 53 });
    // Il 31 dicembre 2024 e martedi: settimana 1 del 2025.
    expect(settimanaIso(dataCivile('2024-12-30'))).toEqual({ anno: 2025, settimana: 1 });
    // Il 1 gennaio 2026 e giovedi: settimana 1 del 2026.
    expect(settimanaIso(dataCivile('2026-01-01'))).toEqual({ anno: 2026, settimana: 1 });
  });

  it('trova il lunedi della settimana', () => {
    expect(inizioSettimana(dataCivile('2026-09-16'))).toBe('2026-09-14');
    expect(inizioSettimana(dataCivile('2026-09-14'))).toBe('2026-09-14');
    expect(inizioSettimana(dataCivile('2026-09-20'))).toBe('2026-09-14');
  });
});

describe('intervalli', () => {
  it('elenca i giorni inclusi gli estremi', () => {
    const giorni = giorniTra(dataCivile('2026-09-14'), dataCivile('2026-09-16'));
    expect(giorni).toEqual(['2026-09-14', '2026-09-15', '2026-09-16']);
  });

  it('restituisce un solo giorno se gli estremi coincidono', () => {
    expect(giorniTra(dataCivile('2026-09-14'), dataCivile('2026-09-14'))).toHaveLength(1);
  });

  it('restituisce vuoto se l intervallo e invertito', () => {
    expect(giorniTra(dataCivile('2026-09-16'), dataCivile('2026-09-14'))).toEqual([]);
  });

  it('conta i giorni del mese', () => {
    expect(giorniNelMese(dataCivile('2026-02-10'))).toBe(28);
    expect(giorniNelMese(dataCivile('2024-02-10'))).toBe(29);
    expect(giorniNelMese(dataCivile('2026-09-10'))).toBe(30);
    expect(giorniNelMese(dataCivile('2026-01-10'))).toBe(31);
  });
});

describe('conversione da istante', () => {
  it('usa il fuso indicato, non quello del processo', () => {
    // 2026-09-16T23:30:00Z e gia il 17 settembre a Roma (UTC+2 in estate).
    const istante = new Date('2026-09-16T23:30:00Z');
    expect(daIstante(istante, 'Europe/Rome')).toBe('2026-09-17');
    expect(daIstante(istante, 'UTC')).toBe('2026-09-16');
  });

  it('in inverno Roma e UTC+1', () => {
    const istante = new Date('2026-01-15T23:30:00Z');
    expect(daIstante(istante, 'Europe/Rome')).toBe('2026-01-16');
  });
});
