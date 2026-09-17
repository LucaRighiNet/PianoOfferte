import { describe, expect, it } from 'vitest';
import { dataCivile } from '@/lib/data/dataCivile';
import {
  collocaBarra,
  colonnaDelGiorno,
  giornoAllaPosizione,
  intersecaFinestra,
} from './geometria';

const DA = dataCivile('2026-09-14');
const A = dataCivile('2026-09-20');
const LARGHEZZA = 20;

describe('intersezione con la finestra', () => {
  it('riconosce un intervallo interno', () => {
    expect(intersecaFinestra(DA, A, dataCivile('2026-09-15'), dataCivile('2026-09-16'))).toBe(true);
  });

  it('riconosce un intervallo che tocca solo il bordo', () => {
    expect(intersecaFinestra(DA, A, dataCivile('2026-09-01'), DA)).toBe(true);
    expect(intersecaFinestra(DA, A, A, dataCivile('2026-10-01'))).toBe(true);
  });

  it('esclude un intervallo tutto prima o tutto dopo', () => {
    expect(
      intersecaFinestra(DA, A, dataCivile('2026-09-01'), dataCivile('2026-09-13')),
    ).toBe(false);
    expect(
      intersecaFinestra(DA, A, dataCivile('2026-09-21'), dataCivile('2026-09-30')),
    ).toBe(false);
  });

  it('esclude un intervallo invertito', () => {
    expect(intersecaFinestra(DA, A, dataCivile('2026-09-18'), dataCivile('2026-09-15'))).toBe(
      false,
    );
  });
});

describe('collocazione della barra', () => {
  it('un giorno singolo al primo giorno della finestra', () => {
    const c = collocaBarra(DA, A, LARGHEZZA, DA, DA);
    expect(c).toEqual({ sinistra: 0, larghezza: 20, tagliataInizio: false, tagliataFine: false });
  });

  it('un giorno singolo in mezzo', () => {
    const c = collocaBarra(DA, A, LARGHEZZA, dataCivile('2026-09-16'), dataCivile('2026-09-16'));
    expect(c?.sinistra).toBe(40);
    expect(c?.larghezza).toBe(20);
  });

  it('la larghezza include entrambi gli estremi', () => {
    const c = collocaBarra(DA, A, LARGHEZZA, dataCivile('2026-09-15'), dataCivile('2026-09-17'));
    expect(c?.larghezza).toBe(60); // tre giorni
  });

  it('taglia a sinistra e lo segnala', () => {
    const c = collocaBarra(DA, A, LARGHEZZA, dataCivile('2026-09-01'), dataCivile('2026-09-15'));
    expect(c?.sinistra).toBe(0);
    expect(c?.larghezza).toBe(40); // 14 e 15 settembre
    expect(c?.tagliataInizio).toBe(true);
    expect(c?.tagliataFine).toBe(false);
  });

  it('taglia a destra e lo segnala', () => {
    const c = collocaBarra(DA, A, LARGHEZZA, dataCivile('2026-09-19'), dataCivile('2026-10-05'));
    expect(c?.sinistra).toBe(100);
    expect(c?.larghezza).toBe(40); // 19 e 20 settembre
    expect(c?.tagliataFine).toBe(true);
  });

  it('taglia da entrambi i lati una barra che copre tutta la finestra', () => {
    const c = collocaBarra(DA, A, LARGHEZZA, dataCivile('2026-08-01'), dataCivile('2026-10-31'));
    expect(c?.sinistra).toBe(0);
    expect(c?.larghezza).toBe(140); // sette giorni
    expect(c?.tagliataInizio).toBe(true);
    expect(c?.tagliataFine).toBe(true);
  });

  it('non colloca una barra fuori finestra', () => {
    expect(
      collocaBarra(DA, A, LARGHEZZA, dataCivile('2026-10-01'), dataCivile('2026-10-02')),
    ).toBeNull();
  });

  it('non colloca una barra invertita', () => {
    expect(
      collocaBarra(DA, A, LARGHEZZA, dataCivile('2026-09-18'), dataCivile('2026-09-15')),
    ).toBeNull();
  });

  it('rifiuta una larghezza giorno non positiva invece di dividere per zero', () => {
    expect(collocaBarra(DA, A, 0, DA, DA)).toBeNull();
    expect(collocaBarra(DA, A, -5, DA, DA)).toBeNull();
  });

  it('la larghezza e sempre positiva su ogni barra valida della finestra', () => {
    for (let i = 0; i < 7; i += 1) {
      for (let j = i; j < 7; j += 1) {
        const inizio = dataCivile(`2026-09-${String(14 + i).padStart(2, '0')}`);
        const fine = dataCivile(`2026-09-${String(14 + j).padStart(2, '0')}`);
        const c = collocaBarra(DA, A, LARGHEZZA, inizio, fine);
        expect(c).not.toBeNull();
        expect(c!.larghezza).toBeGreaterThan(0);
        expect(c!.sinistra).toBeGreaterThanOrEqual(0);
        expect(c!.sinistra + c!.larghezza).toBeLessThanOrEqual(7 * LARGHEZZA);
      }
    }
  });
});

describe('colonna del giorno', () => {
  it('parte da zero sul primo giorno', () => {
    expect(colonnaDelGiorno(DA, A, DA)).toBe(0);
    expect(colonnaDelGiorno(DA, A, dataCivile('2026-09-16'))).toBe(2);
    expect(colonnaDelGiorno(DA, A, A)).toBe(6);
  });

  it('e nulla fuori finestra', () => {
    expect(colonnaDelGiorno(DA, A, dataCivile('2026-09-13'))).toBeNull();
    expect(colonnaDelGiorno(DA, A, dataCivile('2026-09-21'))).toBeNull();
  });
});

describe('giorno alla posizione', () => {
  it('converte pixel in indice di colonna', () => {
    expect(giornoAllaPosizione(DA, LARGHEZZA, 0)).toBe(0);
    expect(giornoAllaPosizione(DA, LARGHEZZA, 19)).toBe(0);
    expect(giornoAllaPosizione(DA, LARGHEZZA, 20)).toBe(1);
    expect(giornoAllaPosizione(DA, LARGHEZZA, 45)).toBe(2);
  });

  it('non divide per zero', () => {
    expect(giornoAllaPosizione(DA, 0, 100)).toBe(0);
  });
});
