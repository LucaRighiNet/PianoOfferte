import { describe, expect, it } from 'vitest';
import { dataCivile } from '@/lib/data/dataCivile';
import {
  CalendarioLavorativo,
  DurataNonPianificabile,
  PersonaSconosciuta,
  type PersonaCapacita,
  type VoceIndisponibilita,
} from './calendarioLavorativo';

const DOMENICO: PersonaCapacita = { id: 'p1', capacitaOreGiorno: 8, percentualeContratto: 100 };
const PART_TIME: PersonaCapacita = { id: 'p2', capacitaOreGiorno: 8, percentualeContratto: 50 };
/** Risponde alla decisione aperta D9: chi fa offerte solo per meta giornata. */
const META_OFFERTE: PersonaCapacita = { id: 'p3', capacitaOreGiorno: 4, percentualeContratto: 100 };

function cal(indisponibilita: VoceIndisponibilita[] = []): CalendarioLavorativo {
  return new CalendarioLavorativo([DOMENICO, PART_TIME, META_OFFERTE], indisponibilita);
}

describe('ore disponibili', () => {
  it('un giorno feriale vale la capacita piena', () => {
    // Mercoledi 16 settembre 2026.
    expect(cal().oreDisponibili('p1', dataCivile('2026-09-16'))).toBe(8);
  });

  it('il weekend vale zero', () => {
    expect(cal().oreDisponibili('p1', dataCivile('2026-09-19'))).toBe(0);
    expect(cal().oreDisponibili('p1', dataCivile('2026-09-20'))).toBe(0);
  });

  it('le festivita nazionali valgono zero', () => {
    const c = cal();
    expect(c.oreDisponibili('p1', dataCivile('2026-08-15'))).toBe(0);
    expect(c.oreDisponibili('p1', dataCivile('2026-04-06'))).toBe(0); // Lunedi dell'Angelo
    expect(c.nomeFestivita(dataCivile('2026-12-25'))).toBe('Natale');
    expect(c.nomeFestivita(dataCivile('2026-09-16'))).toBeNull();
  });

  it('la percentuale di contratto riduce la capacita', () => {
    expect(cal().oreDisponibili('p2', dataCivile('2026-09-16'))).toBe(4);
  });

  it('una capacita ridotta per quota offerte riduce la giornata', () => {
    expect(cal().oreDisponibili('p3', dataCivile('2026-09-16'))).toBe(4);
  });

  it('una assenza a giornata intera azzera il giorno', () => {
    const c = cal([
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-14'),
        dataFine: dataCivile('2026-09-18'),
        oreGiorno: null,
      },
    ]);
    expect(c.oreDisponibili('p1', dataCivile('2026-09-16'))).toBe(0);
    expect(c.oreDisponibili('p1', dataCivile('2026-09-21'))).toBe(8);
  });

  it('una assenza parziale sottrae le ore indicate', () => {
    const c = cal([
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-16'),
        dataFine: dataCivile('2026-09-16'),
        oreGiorno: 3,
      },
    ]);
    expect(c.oreDisponibili('p1', dataCivile('2026-09-16'))).toBe(5);
  });

  it('una assenza parziale non porta mai la capacita sotto zero', () => {
    const c = cal([
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-16'),
        dataFine: dataCivile('2026-09-16'),
        oreGiorno: 20,
      },
    ]);
    expect(c.oreDisponibili('p1', dataCivile('2026-09-16'))).toBe(0);
  });

  it('assenze parziali sovrapposte si sommano', () => {
    const c = cal([
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-16'),
        dataFine: dataCivile('2026-09-16'),
        oreGiorno: 2,
      },
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-16'),
        dataFine: dataCivile('2026-09-16'),
        oreGiorno: 3,
      },
    ]);
    expect(c.oreDisponibili('p1', dataCivile('2026-09-16'))).toBe(3);
  });

  it('una chiusura aziendale vale per tutte le persone', () => {
    const c = cal([
      {
        personaId: null,
        dataInizio: dataCivile('2026-08-10'),
        dataFine: dataCivile('2026-08-21'),
        oreGiorno: null,
      },
    ]);
    expect(c.oreDisponibili('p1', dataCivile('2026-08-12'))).toBe(0);
    expect(c.oreDisponibili('p2', dataCivile('2026-08-12'))).toBe(0);
    expect(c.oreDisponibili('p3', dataCivile('2026-08-12'))).toBe(0);
  });

  it('una persona sconosciuta e un errore esplicito, non zero silenzioso', () => {
    expect(() => cal().oreDisponibili('inesistente', dataCivile('2026-09-16'))).toThrow(
      PersonaSconosciuta,
    );
  });
});

describe('capacita netta su intervallo', () => {
  it('somma una settimana lavorativa piena', () => {
    // Lunedi 14 - domenica 20 settembre 2026: 5 giorni lavorativi.
    expect(cal().capacitaNetta('p1', dataCivile('2026-09-14'), dataCivile('2026-09-20'))).toBe(40);
  });

  it('sottrae ferie e festivita', () => {
    const c = cal([
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-16'),
        dataFine: dataCivile('2026-09-17'),
        oreGiorno: null,
      },
    ]);
    expect(c.capacitaNetta('p1', dataCivile('2026-09-14'), dataCivile('2026-09-20'))).toBe(24);
  });

  it('una settimana con Ferragosto vale un giorno in meno', () => {
    // Ferragosto 2026 cade di sabato, quindi non toglie giorni lavorativi.
    expect(cal().capacitaNetta('p1', dataCivile('2026-08-10'), dataCivile('2026-08-16'))).toBe(40);
    // Il 1 maggio 2026 e venerdi: toglie un giorno.
    expect(cal().capacitaNetta('p1', dataCivile('2026-04-27'), dataCivile('2026-05-03'))).toBe(32);
  });
});

describe('prossimo giorno lavorativo', () => {
  it('restituisce lo stesso giorno se e gia lavorativo', () => {
    expect(cal().prossimoGiornoLavorativo('p1', dataCivile('2026-09-16'))).toBe('2026-09-16');
  });

  it('salta il weekend', () => {
    expect(cal().prossimoGiornoLavorativo('p1', dataCivile('2026-09-19'))).toBe('2026-09-21');
  });

  it('salta ponte e festivita', () => {
    // 25 aprile 2026 e sabato, 26 domenica: si riparte lunedi 27.
    expect(cal().prossimoGiornoLavorativo('p1', dataCivile('2026-04-25'))).toBe('2026-04-27');
  });

  it('restituisce null se non trova capacita entro l orizzonte', () => {
    const c = cal([
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-01-01'),
        dataFine: dataCivile('2030-01-01'),
        oreGiorno: null,
      },
    ]);
    expect(c.prossimoGiornoLavorativo('p1', dataCivile('2026-09-16'))).toBeNull();
  });
});

describe('espansione della durata', () => {
  it('mezza giornata resta nello stesso giorno', () => {
    const p = cal().espandiDurata('p1', dataCivile('2026-09-16'), 4);
    expect(p.dataInizio).toBe('2026-09-16');
    expect(p.dataFine).toBe('2026-09-16');
    expect(p.ripartizione).toEqual([{ giorno: '2026-09-16', ore: 4 }]);
  });

  it('una giornata piena resta nello stesso giorno', () => {
    const p = cal().espandiDurata('p1', dataCivile('2026-09-16'), 8);
    expect(p.dataFine).toBe('2026-09-16');
    expect(p.ripartizione).toHaveLength(1);
  });

  it('dodici ore occupano due giorni, 8 piu 4', () => {
    const p = cal().espandiDurata('p1', dataCivile('2026-09-16'), 12);
    expect(p.dataInizio).toBe('2026-09-16');
    expect(p.dataFine).toBe('2026-09-17');
    expect(p.ripartizione).toEqual([
      { giorno: '2026-09-16', ore: 8 },
      { giorno: '2026-09-17', ore: 4 },
    ]);
  });

  // E' il caso delle barre spezzate visibili nello screenshot del beta.
  it('scavalca il weekend senza consumarlo', () => {
    // Venerdi 18 settembre 2026, 16 ore: venerdi e lunedi.
    const p = cal().espandiDurata('p1', dataCivile('2026-09-18'), 16);
    expect(p.dataInizio).toBe('2026-09-18');
    expect(p.dataFine).toBe('2026-09-21');
    expect(p.ripartizione.map((r) => r.giorno)).toEqual(['2026-09-18', '2026-09-21']);
  });

  it('scavalca una settimana di ferie', () => {
    const c = cal([
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-08-31'),
        dataFine: dataCivile('2026-09-06'),
        oreGiorno: null,
      },
    ]);
    const p = c.espandiDurata('p1', dataCivile('2026-08-28'), 16);
    expect(p.dataInizio).toBe('2026-08-28'); // venerdi
    expect(p.dataFine).toBe('2026-09-07'); // lunedi dopo le ferie
    expect(p.ripartizione).toEqual([
      { giorno: '2026-08-28', ore: 8 },
      { giorno: '2026-09-07', ore: 8 },
    ]);
  });

  it('un inizio in giorno non lavorativo scivola al primo utile', () => {
    // Sabato 19 settembre 2026.
    const p = cal().espandiDurata('p1', dataCivile('2026-09-19'), 8);
    expect(p.dataInizio).toBe('2026-09-21');
    expect(p.dataFine).toBe('2026-09-21');
  });

  it('tiene conto della capacita ridotta', () => {
    // p3 ha 4 ore al giorno: 8 ore occupano due giorni.
    const p = cal().espandiDurata('p3', dataCivile('2026-09-16'), 8);
    expect(p.dataFine).toBe('2026-09-17');
    expect(p.ripartizione).toEqual([
      { giorno: '2026-09-16', ore: 4 },
      { giorno: '2026-09-17', ore: 4 },
    ]);
  });

  it('tiene conto di una assenza parziale in mezzo', () => {
    const c = cal([
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-09-17'),
        dataFine: dataCivile('2026-09-17'),
        oreGiorno: 6,
      },
    ]);
    const p = c.espandiDurata('p1', dataCivile('2026-09-16'), 12);
    // Il 17 restano solo 2 ore: le 2 ore residue slittano al 18.
    // Nessuna ora viene persa per strada.
    expect(p.ripartizione).toEqual([
      { giorno: '2026-09-16', ore: 8 },
      { giorno: '2026-09-17', ore: 2 },
      { giorno: '2026-09-18', ore: 2 },
    ]);
    expect(p.dataFine).toBe('2026-09-18');
  });

  it('la somma della ripartizione coincide con le ore richieste', () => {
    for (const ore of [0.5, 1, 4, 7.5, 12, 37, 100]) {
      const p = cal().espandiDurata('p1', dataCivile('2026-09-16'), ore);
      const somma = p.ripartizione.reduce((acc, r) => acc + r.ore, 0);
      expect(Math.round(somma * 100) / 100).toBe(ore);
    }
  });

  it('rifiuta durate non positive invece di produrre barre a larghezza zero', () => {
    expect(() => cal().espandiDurata('p1', dataCivile('2026-09-16'), 0)).toThrow(
      DurataNonPianificabile,
    );
    expect(() => cal().espandiDurata('p1', dataCivile('2026-09-16'), -4)).toThrow(
      DurataNonPianificabile,
    );
    expect(() => cal().espandiDurata('p1', dataCivile('2026-09-16'), Number.NaN)).toThrow(
      DurataNonPianificabile,
    );
  });

  it('rifiuta una persona sconosciuta', () => {
    expect(() => cal().espandiDurata('xxx', dataCivile('2026-09-16'), 8)).toThrow(
      PersonaSconosciuta,
    );
  });

  it('segnala con un errore chiaro se non c e capacita entro l orizzonte', () => {
    const c = cal([
      {
        personaId: 'p1',
        dataInizio: dataCivile('2026-01-01'),
        dataFine: dataCivile('2030-01-01'),
        oreGiorno: null,
      },
    ]);
    expect(() => c.espandiDurata('p1', dataCivile('2026-09-16'), 8)).toThrow(
      DurataNonPianificabile,
    );
  });
});

describe('conoscenza delle persone', () => {
  it('riconosce le persone che ha', () => {
    const c = cal();
    expect(c.conoscePersona('p1')).toBe(true);
    expect(c.conoscePersona('p3')).toBe(true);
  });

  /**
   * E' il caso di chi riceve un insieme ridotto di persone per motivi di
   * visibilita: le attivita altrui restano visibili, il loro calendario no.
   * Il chiamante deve poterlo chiedere invece di scoprirlo con una eccezione.
   */
  it('dichiara di non conoscere le altre, senza sollevare eccezione', () => {
    expect(cal().conoscePersona('sconosciuta')).toBe(false);
  });
});
