import { describe, expect, it } from 'vitest';
import {
  finestraDaCaricare,
  LIVELLI_ZOOM,
  ZOOM,
  ZOOM_PREDEFINITO,
  zoomDaParametro,
} from './zoom';

describe('lettura dello zoom dall indirizzo', () => {
  it('accetta i livelli noti', () => {
    for (const livello of LIVELLI_ZOOM) {
      expect(zoomDaParametro(livello)).toBe(livello);
    }
  });

  it('ripiega sul predefinito su valori sconosciuti o assenti', () => {
    expect(zoomDaParametro(undefined)).toBe(ZOOM_PREDEFINITO);
    expect(zoomDaParametro('')).toBe(ZOOM_PREDEFINITO);
    expect(zoomDaParametro('fitto')).toBe(ZOOM_PREDEFINITO);
    expect(zoomDaParametro('ENORME')).toBe(ZOOM_PREDEFINITO);
  });
});

describe('finestra da caricare', () => {
  it('copre sempre almeno il periodo visibile', () => {
    for (const livello of LIVELLI_ZOOM) {
      const visibili = ZOOM[livello].giorniVisibili;
      const f = finestraDaCaricare(livello);
      expect(f.dopoLAncora + 1).toBeGreaterThanOrEqual(visibili);
    }
  });

  /**
   * Il margine non scala con il periodo: sul trimestre farebbe pesare la
   * pagina piu di quanto valga. Resta limitato a quello dello zoom normale.
   */
  it('il margine e limitato a quello dello zoom normale', () => {
    expect(finestraDaCaricare('COMPATTO').primaDellAncora).toBe(
      ZOOM[ZOOM_PREDEFINITO].giorniVisibili,
    );
    expect(finestraDaCaricare('FITTO').primaDellAncora).toBe(ZOOM.FITTO.giorniVisibili);
  });

  it('agli zoom stretti una freccia resta dentro il caricato', () => {
    for (const livello of ['FITTO', 'NORMALE'] as const) {
      const visibili = ZOOM[livello].giorniVisibili;
      const f = finestraDaCaricare(livello);
      expect(visibili + visibili - 1).toBeLessThanOrEqual(f.dopoLAncora);
      expect(f.primaDellAncora).toBeGreaterThanOrEqual(visibili);
    }
  });

  it('allo zoom stretto carica molto meno che a quello largo', () => {
    const stretto = finestraDaCaricare('FITTO');
    const largo = finestraDaCaricare('COMPATTO');
    const giorni = (f: { primaDellAncora: number; dopoLAncora: number }) =>
      f.primaDellAncora + f.dopoLAncora;
    expect(giorni(stretto) * 3).toBeLessThan(giorni(largo));
  });
});
