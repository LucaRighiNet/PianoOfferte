import { describe, expect, it } from 'vitest';
import { aggiungiGiorni, dataCivile, type DataCivile } from '@/lib/data/dataCivile';
import { impilaInCorsie, massimaSovrapposizione, type IntervalloImpilabile } from './corsie';

function iv(id: string, inizio: string, fine: string): IntervalloImpilabile {
  return { id, inizio: dataCivile(inizio), fine: dataCivile(fine) };
}

describe('impilamento in corsie', () => {
  it('un elenco vuoto non produce corsie', () => {
    const r = impilaInCorsie([]);
    expect(r.corsie).toBe(0);
    expect(r.elementi).toEqual([]);
  });

  it('attivita consecutive condividono la stessa corsia', () => {
    const r = impilaInCorsie([
      iv('a', '2026-09-14', '2026-09-15'),
      iv('b', '2026-09-16', '2026-09-17'),
      iv('c', '2026-09-18', '2026-09-18'),
    ]);
    expect(r.corsie).toBe(1);
    expect(r.elementi.every((e) => e.corsia === 0)).toBe(true);
  });

  it('attivita sovrapposte occupano corsie diverse', () => {
    const r = impilaInCorsie([
      iv('a', '2026-09-14', '2026-09-18'),
      iv('b', '2026-09-15', '2026-09-16'),
    ]);
    expect(r.corsie).toBe(2);
    expect(r.elementi.find((e) => e.elemento.id === 'a')?.corsia).toBe(0);
    expect(r.elementi.find((e) => e.elemento.id === 'b')?.corsia).toBe(1);
  });

  it('due attivita che si toccano nello stesso giorno collidono', () => {
    // Gli intervalli sono inclusivi: finire e cominciare il 16 e sovrapporsi.
    const r = impilaInCorsie([
      iv('a', '2026-09-14', '2026-09-16'),
      iv('b', '2026-09-16', '2026-09-18'),
    ]);
    expect(r.corsie).toBe(2);
  });

  it('riusa una corsia liberata', () => {
    const r = impilaInCorsie([
      iv('a', '2026-09-14', '2026-09-15'),
      iv('b', '2026-09-14', '2026-09-15'),
      iv('c', '2026-09-17', '2026-09-18'),
    ]);
    expect(r.corsie).toBe(2);
    expect(r.elementi.find((e) => e.elemento.id === 'c')?.corsia).toBe(0);
  });

  it('usa il numero minimo di corsie, pari alla massima sovrapposizione', () => {
    const elementi = [
      iv('a', '2026-09-14', '2026-09-20'),
      iv('b', '2026-09-15', '2026-09-16'),
      iv('c', '2026-09-15', '2026-09-17'),
      iv('d', '2026-09-18', '2026-09-19'),
    ];
    const r = impilaInCorsie(elementi);
    expect(r.corsie).toBe(massimaSovrapposizione(elementi));
    expect(r.corsie).toBe(3);
  });

  it('il risultato non dipende dall ordine di ingresso', () => {
    const elementi = [
      iv('a', '2026-09-14', '2026-09-20'),
      iv('b', '2026-09-15', '2026-09-16'),
      iv('c', '2026-09-17', '2026-09-19'),
    ];
    const diretto = impilaInCorsie(elementi);
    const invertito = impilaInCorsie([...elementi].reverse());
    expect(invertito.corsie).toBe(diretto.corsie);
    for (const e of diretto.elementi) {
      const omologo = invertito.elementi.find((x) => x.elemento.id === e.elemento.id);
      expect(omologo?.corsia).toBe(e.corsia);
    }
  });

  it('non perde elementi', () => {
    const elementi = [
      iv('a', '2026-09-14', '2026-09-20'),
      iv('b', '2026-09-15', '2026-09-16'),
      iv('c', '2026-09-15', '2026-09-16'),
    ];
    const r = impilaInCorsie(elementi);
    expect(r.elementi).toHaveLength(3);
    expect(new Set(r.elementi.map((e) => e.elemento.id))).toEqual(new Set(['a', 'b', 'c']));
  });

  it('scarta gli intervalli invertiti invece di disegnarli a larghezza negativa', () => {
    const r = impilaInCorsie([
      iv('valido', '2026-09-14', '2026-09-15'),
      iv('rotto', '2026-09-18', '2026-09-14'),
    ]);
    expect(r.elementi).toHaveLength(1);
    expect(r.scartati.map((s) => s.id)).toEqual(['rotto']);
  });

  // Verifica su dati generati: l'impilamento greedy deve sempre raggiungere
  // l'ottimo teorico, che per i grafi di intervalli e la massima sovrapposizione.
  it('raggiunge l ottimo su 200 insiemi casuali', () => {
    let seme = 12345;
    const random = (): number => {
      seme = (seme * 1103515245 + 12345) % 2147483648;
      return seme / 2147483648;
    };
    const base = dataCivile('2026-01-01');

    for (let prova = 0; prova < 200; prova += 1) {
      const quanti = 1 + Math.floor(random() * 25);
      const elementi: IntervalloImpilabile[] = [];
      for (let i = 0; i < quanti; i += 1) {
        const inizio: DataCivile = aggiungiGiorni(base, Math.floor(random() * 60));
        const durata = Math.floor(random() * 10);
        elementi.push({ id: `e${i}`, inizio, fine: aggiungiGiorni(inizio, durata) });
      }
      const r = impilaInCorsie(elementi);
      expect(r.corsie).toBe(massimaSovrapposizione(elementi));
      expect(r.elementi).toHaveLength(quanti);

      // Nessuna sovrapposizione all'interno della stessa corsia.
      const perCorsia = new Map<number, IntervalloImpilabile[]>();
      for (const e of r.elementi) {
        const elenco = perCorsia.get(e.corsia) ?? [];
        elenco.push(e.elemento);
        perCorsia.set(e.corsia, elenco);
      }
      for (const elenco of perCorsia.values()) {
        expect(massimaSovrapposizione(elenco)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('massima sovrapposizione', () => {
  it('vale zero su elenco vuoto', () => {
    expect(massimaSovrapposizione([])).toBe(0);
  });

  it('vale uno per un solo intervallo', () => {
    expect(massimaSovrapposizione([iv('a', '2026-09-14', '2026-09-20')])).toBe(1);
  });

  it('ignora gli intervalli invertiti', () => {
    expect(massimaSovrapposizione([iv('rotto', '2026-09-20', '2026-09-14')])).toBe(0);
  });
});
