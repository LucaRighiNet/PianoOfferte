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

export type Raggruppamento = 'RISORSA' | 'OFFERTA' | 'CLIENTE' | 'KAM';

export const ETICHETTE_RAGGRUPPAMENTO: Readonly<Record<Raggruppamento, string>> = {
  RISORSA: 'Per risorsa',
  OFFERTA: 'Per offerta',
  CLIENTE: 'Per cliente',
  KAM: 'Per KAM',
};
