import { describe, expect, it } from 'vitest';
import {
  ETICHETTE_RUOLO,
  puoCambiareStato,
  puoCreareOfferta,
  puoModificareImpostazioni,
  puoPianificare,
  puoRegistrareConsuntivo,
  puoVedereCaricoNominativo,
  puoVedereConsuntiviNominativi,
  puoVedereValori,
  RUOLI,
  type Ruolo,
} from './permessi';

const IO = 'p1';
const ALTRO = 'p2';

describe('pianificazione', () => {
  it('pianificano responsabile e direzione', () => {
    expect(puoPianificare('RESPONSABILE')).toBe(true);
    expect(puoPianificare('DIREZIONE')).toBe(true);
  });

  it('non pianificano operatore, KAM e sola lettura', () => {
    expect(puoPianificare('OPERATORE')).toBe(false);
    expect(puoPianificare('KAM')).toBe(false);
    expect(puoPianificare('SOLA_LETTURA')).toBe(false);
  });
});

describe('creazione offerte', () => {
  // Decisione D4: concentrarle su una sola persona la rende un collo di bottiglia.
  it('creano responsabile, KAM e direzione', () => {
    expect(puoCreareOfferta('RESPONSABILE')).toBe(true);
    expect(puoCreareOfferta('KAM')).toBe(true);
    expect(puoCreareOfferta('DIREZIONE')).toBe(true);
  });

  it('non creano operatore e sola lettura', () => {
    expect(puoCreareOfferta('OPERATORE')).toBe(false);
    expect(puoCreareOfferta('SOLA_LETTURA')).toBe(false);
  });
});

describe('impostazioni', () => {
  it('le modificano solo responsabile e direzione', () => {
    const consentiti = RUOLI.filter(puoModificareImpostazioni);
    expect(consentiti).toEqual(['RESPONSABILE', 'DIREZIONE']);
  });
});

describe('valori economici', () => {
  it('non sono visibili a operatore e sola lettura', () => {
    expect(puoVedereValori('OPERATORE')).toBe(false);
    expect(puoVedereValori('SOLA_LETTURA')).toBe(false);
    expect(puoVedereValori('KAM')).toBe(true);
  });
});

describe('carico nominativo', () => {
  it('responsabile e direzione vedono chiunque', () => {
    expect(puoVedereCaricoNominativo('RESPONSABILE', IO, ALTRO)).toBe(true);
    expect(puoVedereCaricoNominativo('DIREZIONE', IO, ALTRO)).toBe(true);
  });

  it('un operatore vede il proprio', () => {
    expect(puoVedereCaricoNominativo('OPERATORE', IO, IO)).toBe(true);
  });

  // La regola che discende dal par. 14.1: nessuna classifica fra persone.
  it('un operatore non vede quello di un collega', () => {
    expect(puoVedereCaricoNominativo('OPERATORE', IO, ALTRO)).toBe(false);
    expect(puoVedereCaricoNominativo('KAM', IO, ALTRO)).toBe(false);
    expect(puoVedereCaricoNominativo('SOLA_LETTURA', IO, ALTRO)).toBe(false);
  });
});

describe('cambio di stato', () => {
  it('chi pianifica puo cambiare qualunque stato', () => {
    expect(puoCambiareStato('RESPONSABILE', IO, ALTRO)).toBe(true);
  });

  it('un operatore cambia lo stato di cio che ha in mano', () => {
    expect(puoCambiareStato('OPERATORE', IO, IO)).toBe(true);
  });

  it('un operatore non tocca il lavoro di un altro', () => {
    expect(puoCambiareStato('OPERATORE', IO, ALTRO)).toBe(false);
  });

  it('nessuno cambia lo stato di una attivita non assegnata, se non pianifica', () => {
    expect(puoCambiareStato('OPERATORE', IO, null)).toBe(false);
    expect(puoCambiareStato('RESPONSABILE', IO, null)).toBe(true);
  });

  it('la sola lettura non cambia nulla, nemmeno il proprio', () => {
    expect(puoCambiareStato('SOLA_LETTURA', IO, IO)).toBe(false);
  });
});

describe('consuntivo ore', () => {
  it('lo registra solo chi ha svolto il lavoro', () => {
    expect(puoRegistrareConsuntivo('OPERATORE', IO, IO)).toBe(true);
  });

  /**
   * Il responsabile NON lo registra al posto di altri: sarebbe un dato sulla
   * prestazione altrui inserito da un terzo, e non e cio che serve a tarare le
   * stime. E' la regola che tiene la funzione dentro il perimetro dell'art. 4.
   */
  it('nemmeno il responsabile lo registra per conto di altri', () => {
    expect(puoRegistrareConsuntivo('RESPONSABILE', IO, ALTRO)).toBe(false);
    expect(puoRegistrareConsuntivo('DIREZIONE', IO, ALTRO)).toBe(false);
  });

  it('non si registra su una attivita non assegnata', () => {
    expect(puoRegistrareConsuntivo('OPERATORE', IO, null)).toBe(false);
  });

  it('la sola lettura non registra', () => {
    expect(puoRegistrareConsuntivo('SOLA_LETTURA', IO, IO)).toBe(false);
  });

  it('i consuntivi nominativi altrui li vedono solo responsabile e direzione', () => {
    expect(RUOLI.filter(puoVedereConsuntiviNominativi)).toEqual([
      'RESPONSABILE',
      'DIREZIONE',
    ]);
  });
});

describe('completezza', () => {
  it('ogni ruolo ha una etichetta', () => {
    for (const r of RUOLI) expect(ETICHETTE_RUOLO[r as Ruolo]).toBeTruthy();
    expect(Object.keys(ETICHETTE_RUOLO)).toHaveLength(RUOLI.length);
  });
});
