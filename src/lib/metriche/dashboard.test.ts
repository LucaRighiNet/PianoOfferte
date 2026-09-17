import { describe, expect, it } from 'vitest';
import { dataCivile } from '@/lib/data/dataCivile';
import {
  leadTime,
  leadTimeComplessivo,
  leadTimePerTipo,
  mediana,
  offerteARischio,
  ordinaWip,
  puntualita,
  type OffertaMisurabile,
  type VoceWip,
} from './dashboard';

function offerta(p: Partial<OffertaMisurabile> & { id: string }): OffertaMisurabile {
  return {
    codice: `OF${p.id}`,
    descrizione: 'Quadri elettrici BT',
    cliente: 'Cummins',
    tipoOfferta: 'Quadro elettrico BT',
    dataRichiesta: dataCivile('2026-09-01'),
    dataScadenzaCliente: dataCivile('2026-09-20'),
    dataFinePianificata: dataCivile('2026-09-10'),
    consegnata: true,
    bloccata: false,
    causaleBlocco: null,
    personaId: 'p1',
    persona: 'Benassi Domenico',
    ...p,
  };
}

describe('mediana', () => {
  it('e nulla su elenco vuoto', () => {
    expect(mediana([])).toBeNull();
  });

  it('su numero dispari di valori prende quello centrale', () => {
    expect(mediana([5, 1, 3])).toBe(3);
  });

  it('su numero pari fa la media dei due centrali', () => {
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
  });

  it('non altera l elenco ricevuto', () => {
    const valori = [5, 1, 3];
    mediana(valori);
    expect(valori).toEqual([5, 1, 3]);
  });

  it('gestisce un solo valore', () => {
    expect(mediana([7])).toBe(7);
  });
});

describe('lead time', () => {
  it('conta i giorni di calendario fra richiesta e fine', () => {
    expect(leadTime(offerta({ id: '1' }))).toBe(9);
  });

  it('e nullo per una offerta non consegnata', () => {
    expect(leadTime(offerta({ id: '1', consegnata: false }))).toBeNull();
  });

  it('e nullo senza fine pianificata', () => {
    expect(leadTime(offerta({ id: '1', dataFinePianificata: null }))).toBeNull();
  });

  it('scarta un lead time negativo invece di riportarlo', () => {
    // Dati incoerenti: la fine precede la richiesta.
    expect(
      leadTime(offerta({ id: '1', dataFinePianificata: dataCivile('2026-08-20') })),
    ).toBeNull();
  });

  it('la mediana complessiva dichiara la dimensione del campione', () => {
    const r = leadTimeComplessivo([
      offerta({ id: '1', dataFinePianificata: dataCivile('2026-09-05') }), // 4
      offerta({ id: '2', dataFinePianificata: dataCivile('2026-09-11') }), // 10
      offerta({ id: '3', consegnata: false }),
    ]);
    expect(r.mediana).toBe(7);
    expect(r.campione).toBe(2);
  });

  it('su nessun dato la mediana e nulla e il campione zero', () => {
    expect(leadTimeComplessivo([])).toEqual({ mediana: null, campione: 0 });
  });
});

describe('lead time per tipo', () => {
  it('ordina dal piu lento al piu rapido', () => {
    const righe = leadTimePerTipo([
      offerta({ id: '1', tipoOfferta: 'Rapido', dataFinePianificata: dataCivile('2026-09-03') }),
      offerta({ id: '2', tipoOfferta: 'Lento', dataFinePianificata: dataCivile('2026-09-21') }),
    ]);
    expect(righe.map((r) => r.tipo)).toEqual(['Lento', 'Rapido']);
    expect(righe[0]?.mediana).toBe(20);
  });

  it('raggruppa le offerte senza tipo', () => {
    const righe = leadTimePerTipo([offerta({ id: '1', tipoOfferta: null })]);
    expect(righe[0]?.tipo).toBe('Senza tipo');
  });

  it('ignora le offerte senza lead time', () => {
    expect(leadTimePerTipo([offerta({ id: '1', consegnata: false })])).toEqual([]);
  });
});

describe('puntualita', () => {
  it('conta solo le consegnate con scadenza nota', () => {
    const p = puntualita([
      offerta({ id: '1', dataFinePianificata: dataCivile('2026-09-18') }), // in tempo
      offerta({ id: '2', dataFinePianificata: dataCivile('2026-09-25') }), // in ritardo
      offerta({ id: '3', dataScadenzaCliente: null }), // esclusa
      offerta({ id: '4', consegnata: false }), // esclusa
    ]);
    expect(p.consegnateTotali).toBe(2);
    expect(p.consegnateInTempo).toBe(1);
    expect(p.percentuale).toBe(50);
  });

  it('consegnare il giorno della scadenza e in tempo', () => {
    const p = puntualita([
      offerta({ id: '1', dataFinePianificata: dataCivile('2026-09-20') }),
    ]);
    expect(p.percentuale).toBe(100);
  });

  it('senza consegne la percentuale e nulla, non zero', () => {
    // Zero significherebbe "non ne consegniamo in tempo": e diverso da "non si sa".
    expect(puntualita([]).percentuale).toBeNull();
  });
});

describe('offerte a rischio', () => {
  it('ordina per margine crescente, prima le sforate', () => {
    const voci = offerteARischio(
      [
        offerta({
          id: '1',
          consegnata: false,
          dataFinePianificata: dataCivile('2026-09-19'),
        }), // margine 1
        offerta({
          id: '2',
          consegnata: false,
          dataFinePianificata: dataCivile('2026-09-25'),
        }), // margine -5
      ],
      5,
    );
    expect(voci.map((v) => v.margine)).toEqual([-5, 1]);
  });

  it('esclude chi ha margine oltre la soglia', () => {
    const voci = offerteARischio(
      [offerta({ id: '1', consegnata: false, dataFinePianificata: dataCivile('2026-09-01') })],
      5,
    );
    expect(voci).toEqual([]);
  });

  it('esclude le offerte gia consegnate', () => {
    expect(
      offerteARischio([offerta({ id: '1', dataFinePianificata: dataCivile('2026-09-25') })], 5),
    ).toEqual([]);
  });

  it('esclude quelle senza scadenza o senza pianificazione', () => {
    const voci = offerteARischio(
      [
        offerta({ id: '1', consegnata: false, dataScadenzaCliente: null }),
        offerta({ id: '2', consegnata: false, dataFinePianificata: null }),
      ],
      5,
    );
    expect(voci).toEqual([]);
  });

  it('a parita di margine ordina per codice, in modo deterministico', () => {
    const voci = offerteARischio(
      [
        offerta({ id: 'b', codice: 'OFb', consegnata: false, dataFinePianificata: dataCivile('2026-09-19') }),
        offerta({ id: 'a', codice: 'OFa', consegnata: false, dataFinePianificata: dataCivile('2026-09-19') }),
      ],
      5,
    );
    expect(voci.map((v) => v.offerta.codice)).toEqual(['OFa', 'OFb']);
  });
});

describe('ordinamento WIP', () => {
  function wip(p: Partial<VoceWip> & { personaId: string; persona: string }): VoceWip {
    return { aperte: 2, limite: 5, oltreIlLimite: false, anzianitaMassima: null, ...p };
  }

  it('mette in cima chi ha superato il limite', () => {
    const voci = ordinaWip([
      wip({ personaId: 'a', persona: 'Anna', aperte: 8 }),
      wip({ personaId: 'b', persona: 'Bruno', aperte: 3, oltreIlLimite: true }),
    ]);
    expect(voci.map((v) => v.persona)).toEqual(['Bruno', 'Anna']);
  });

  it('a parita di stato ordina per numero di aperte', () => {
    const voci = ordinaWip([
      wip({ personaId: 'a', persona: 'Anna', aperte: 1 }),
      wip({ personaId: 'b', persona: 'Bruno', aperte: 4 }),
    ]);
    expect(voci.map((v) => v.persona)).toEqual(['Bruno', 'Anna']);
  });

  it('a parita di tutto ordina per nome', () => {
    const voci = ordinaWip([
      wip({ personaId: 'z', persona: 'Zoli', aperte: 2 }),
      wip({ personaId: 'a', persona: 'Baldini', aperte: 2 }),
    ]);
    expect(voci.map((v) => v.persona)).toEqual(['Baldini', 'Zoli']);
  });
});
