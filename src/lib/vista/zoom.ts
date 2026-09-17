/** Livelli di zoom della timeline. Par. 7.3: lo zoom e un cambio di variabile CSS. */
export type LivelloZoom = 'FITTO' | 'NORMALE' | 'COMPATTO';

export interface DefinizioneZoom {
  readonly etichetta: string;
  readonly larghezzaGiorno: number;
  readonly giorniVisibili: number;
  /** Mostra il numero del giorno nell'intestazione solo se c'e spazio. */
  readonly mostraGiorni: boolean;
}

export const ZOOM: Readonly<Record<LivelloZoom, DefinizioneZoom>> = {
  FITTO: { etichetta: 'Due settimane', larghezzaGiorno: 44, giorniVisibili: 21, mostraGiorni: true },
  NORMALE: { etichetta: 'Due mesi', larghezzaGiorno: 22, giorniVisibili: 63, mostraGiorni: true },
  COMPATTO: { etichetta: 'Trimestre', larghezzaGiorno: 9, giorniVisibili: 126, mostraGiorni: false },
};

export const LIVELLI_ZOOM: readonly LivelloZoom[] = ['FITTO', 'NORMALE', 'COMPATTO'];

export const ZOOM_PREDEFINITO: LivelloZoom = 'NORMALE';

/** Legge il livello di zoom da un parametro di indirizzo, con ripiego sicuro. */
export function zoomDaParametro(valore: string | undefined): LivelloZoom {
  return LIVELLI_ZOOM.find((l) => l === valore) ?? ZOOM_PREDEFINITO;
}

/**
 * Giorni da caricare attorno all'ancora per un dato zoom.
 *
 * Il periodo visibile, piu un margine per lato. Il margine NON scala con il
 * periodo: e limitato a quello dello zoom normale, che e la vista d'uso
 * quotidiano.
 *
 * Misurato: una finestra fissa per tutti gli zoom trasmetteva, allo zoom
 * normale, seicento attivita per mostrarne duecento; un margine proporzionale
 * al periodo faceva pesare lo zoom su trimestre piu di prima. Con il margine
 * limitato, una freccia resta immediata agli zoom stretti, e sul trimestre
 * ricarica, che e accettabile perche a quel livello si naviga di rado.
 */
export function finestraDaCaricare(zoom: LivelloZoom): {
  readonly primaDellAncora: number;
  readonly dopoLAncora: number;
} {
  const visibili = ZOOM[zoom].giorniVisibili;
  const margine = Math.min(visibili, ZOOM[ZOOM_PREDEFINITO].giorniVisibili);
  return { primaDellAncora: margine, dopoLAncora: visibili + margine - 1 };
}

export type Raggruppamento = 'RISORSA' | 'OFFERTA' | 'CLIENTE' | 'KAM';

export const ETICHETTE_RAGGRUPPAMENTO: Readonly<Record<Raggruppamento, string>> = {
  RISORSA: 'Per risorsa',
  OFFERTA: 'Per offerta',
  CLIENTE: 'Per cliente',
  KAM: 'Per KAM',
};
