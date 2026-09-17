import { describe, expect, it } from 'vitest';
import { dataCivile } from '@/lib/data/dataCivile';
import { CalendarioLavorativo } from '@/lib/calendario/calendarioLavorativo';
import {
  anzianitaInCorso,
  eInRitardo,
  ETICHETTE_SEMAFORO,
  ETICHETTE_STATO,
  statoVisualizzato,
  valutaMargine,
  type AttivitaValutabile,
} from './rischio';

const OGGI = dataCivile('2026-09-16'); // mercoledi

function att(p: Partial<AttivitaValutabile>): AttivitaValutabile {
  return { stato: 'NON_INIZIATA', dataFine: null, iniziataIl: null, ...p };
}

describe('stato in ritardo derivato', () => {
  it('e in ritardo se la fine e passata e non e completata', () => {
    expect(eInRitardo(att({ stato: 'IN_CORSO', dataFine: dataCivile('2026-09-15') }), OGGI)).toBe(
      true,
    );
  });

  it('non e in ritardo il giorno stesso della scadenza', () => {
    expect(eInRitardo(att({ stato: 'IN_CORSO', dataFine: OGGI }), OGGI)).toBe(false);
  });

  it('una attivita completata non e mai in ritardo', () => {
    expect(
      eInRitardo(att({ stato: 'COMPLETATA', dataFine: dataCivile('2026-01-01') }), OGGI),
    ).toBe(false);
  });

  it('una attivita senza data non e in ritardo, e non pianificata', () => {
    expect(eInRitardo(att({ stato: 'IN_CORSO', dataFine: null }), OGGI)).toBe(false);
  });

  it('anche una bloccata puo essere in ritardo', () => {
    expect(eInRitardo(att({ stato: 'BLOCCATA', dataFine: dataCivile('2026-09-10') }), OGGI)).toBe(
      true,
    );
  });

  it('il derivato prevale sullo stato memorizzato in colonna', () => {
    expect(
      statoVisualizzato(att({ stato: 'IN_CORSO', dataFine: dataCivile('2026-09-10') }), OGGI),
    ).toBe('IN_RITARDO');
    expect(statoVisualizzato(att({ stato: 'IN_CORSO', dataFine: OGGI }), OGGI)).toBe('IN_CORSO');
    expect(statoVisualizzato(att({ stato: 'NON_INIZIATA' }), OGGI)).toBe('NON_INIZIATA');
  });

  it('ogni stato visualizzabile ha una etichetta', () => {
    expect(Object.keys(ETICHETTE_STATO)).toHaveLength(5);
    expect(ETICHETTE_STATO.IN_RITARDO).toBe('In ritardo');
  });
});

describe('anzianita del lavoro in corso', () => {
  it('conta i giorni dall inizio', () => {
    expect(
      anzianitaInCorso(att({ stato: 'IN_CORSO', iniziataIl: dataCivile('2026-09-10') }), OGGI),
    ).toBe(6);
  });

  it('e nulla se non e mai iniziata', () => {
    expect(anzianitaInCorso(att({ stato: 'NON_INIZIATA' }), OGGI)).toBeNull();
  });

  it('e nulla se e completata', () => {
    expect(
      anzianitaInCorso(att({ stato: 'COMPLETATA', iniziataIl: dataCivile('2026-09-10') }), OGGI),
    ).toBeNull();
  });

  it('non e mai negativa', () => {
    expect(
      anzianitaInCorso(att({ stato: 'IN_CORSO', iniziataIl: dataCivile('2026-09-20') }), OGGI),
    ).toBe(0);
  });
});

describe('margine sulla scadenza', () => {
  it('senza scadenza non c e semaforo', () => {
    const v = valutaMargine(dataCivile('2026-09-16'), null);
    expect(v.semaforo).toBe('SENZA_SCADENZA');
    expect(v.margineGiorniLavorativi).toBeNull();
  });

  it('senza fine pianificata non c e semaforo', () => {
    expect(valutaMargine(null, dataCivile('2026-09-30')).semaforo).toBe('SENZA_SCADENZA');
  });

  it('una fine oltre la scadenza e sforata', () => {
    const v = valutaMargine(dataCivile('2026-09-20'), dataCivile('2026-09-18'));
    expect(v.semaforo).toBe('SFORATA');
    expect(v.margineGiorniCalendario).toBe(-2);
  });

  it('finire il giorno stesso della scadenza non lascia margine', () => {
    const v = valutaMargine(dataCivile('2026-09-16'), dataCivile('2026-09-16'));
    expect(v.margineGiorniLavorativi).toBe(0);
    expect(v.semaforo).toBe('ROSSO');
  });

  it('un giorno lavorativo di margine e ambra', () => {
    // Mercoledi 16 -> giovedi 17: un giorno lavorativo.
    const v = valutaMargine(dataCivile('2026-09-16'), dataCivile('2026-09-17'));
    expect(v.margineGiorniLavorativi).toBe(1);
    expect(v.semaforo).toBe('AMBRA');
  });

  it('tre giorni lavorativi di margine sono verdi', () => {
    // Mercoledi 16 -> lunedi 21: giovedi, venerdi, lunedi.
    const v = valutaMargine(dataCivile('2026-09-16'), dataCivile('2026-09-21'));
    expect(v.margineGiorniLavorativi).toBe(3);
    expect(v.margineGiorniCalendario).toBe(5);
    expect(v.semaforo).toBe('VERDE');
  });

  // Il punto per cui il margine si conta in giorni lavorativi e non di calendario.
  it('il weekend non conta come margine', () => {
    // Venerdi 18 -> lunedi 21: 3 giorni di calendario, 1 lavorativo.
    const v = valutaMargine(dataCivile('2026-09-18'), dataCivile('2026-09-21'));
    expect(v.margineGiorniCalendario).toBe(3);
    expect(v.margineGiorniLavorativi).toBe(1);
    expect(v.semaforo).toBe('AMBRA');
  });

  it('usa il calendario della persona quando disponibile', () => {
    const calendario = new CalendarioLavorativo(
      [{ id: 'p1', capacitaOreGiorno: 8, percentualeContratto: 100 }],
      [
        {
          personaId: 'p1',
          dataInizio: dataCivile('2026-09-17'),
          dataFine: dataCivile('2026-09-18'),
          oreGiorno: null,
        },
      ],
    );
    // Senza calendario: giovedi e venerdi sono margine.
    expect(valutaMargine(dataCivile('2026-09-16'), dataCivile('2026-09-18')).semaforo).toBe(
      'AMBRA',
    );
    // Con il calendario: la persona e in ferie, quindi nessun margine reale.
    const conFerie = valutaMargine(dataCivile('2026-09-16'), dataCivile('2026-09-18'), {
      calendario,
      personaId: 'p1',
    });
    expect(conFerie.margineGiorniLavorativi).toBe(0);
    expect(conFerie.semaforo).toBe('ROSSO');
  });

  it('le festivita non contano come margine', () => {
    // 30 aprile 2026 giovedi -> 4 maggio lunedi. Il 1 maggio e festivo.
    const v = valutaMargine(dataCivile('2026-04-30'), dataCivile('2026-05-04'), {
      calendario: new CalendarioLavorativo(
        [{ id: 'p1', capacitaOreGiorno: 8, percentualeContratto: 100 }],
        [],
      ),
      personaId: 'p1',
    });
    expect(v.margineGiorniCalendario).toBe(4);
    expect(v.margineGiorniLavorativi).toBe(1); // solo lunedi 4
    expect(v.semaforo).toBe('AMBRA');
  });

  it('accetta soglie personalizzate', () => {
    const v = valutaMargine(dataCivile('2026-09-16'), dataCivile('2026-09-21'), {
      soglie: { verdeDa: 5, ambraDa: 2 },
    });
    expect(v.margineGiorniLavorativi).toBe(3);
    expect(v.semaforo).toBe('AMBRA');
  });

  it('ogni semaforo ha una etichetta', () => {
    expect(Object.keys(ETICHETTE_SEMAFORO)).toHaveLength(5);
  });
});
