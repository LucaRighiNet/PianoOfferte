import { type DataCivile } from './dataCivile';

/** Formattazione italiana delle date civili. Nessuna dipendenza da Intl a runtime nei cicli caldi. */

export const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
] as const;

export const MESI_BREVI = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic',
] as const;

/** Iniziali dei giorni, indice 1 = lunedi ... 7 = domenica. */
export const INIZIALI_GIORNI = ['', 'L', 'M', 'M', 'G', 'V', 'S', 'D'] as const;

export function nomeMese(d: DataCivile): string {
  return MESI[Number(d.slice(5, 7)) - 1] ?? '';
}

export function meseBreve(d: DataCivile): string {
  return MESI_BREVI[Number(d.slice(5, 7)) - 1] ?? '';
}

export function numeroGiorno(d: DataCivile): number {
  return Number(d.slice(8, 10));
}

export function anno(d: DataCivile): number {
  return Number(d.slice(0, 4));
}

/** Esempio: "16 set 2026". */
export function formatoBreve(d: DataCivile): string {
  return `${numeroGiorno(d)} ${meseBreve(d)} ${anno(d)}`;
}

/** Esempio: "mercoledi 16 settembre 2026". */
const GIORNI_ESTESI = [
  '', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica',
] as const;

export function formatoEsteso(d: DataCivile, giornoIso: number): string {
  return `${GIORNI_ESTESI[giornoIso] ?? ''} ${numeroGiorno(d)} ${nomeMese(d)} ${anno(d)}`.trim();
}

/** Ore con al massimo un decimale: "4 h", "6,5 h". */
export function formatoOre(ore: number): string {
  const arrotondate = Math.round(ore * 10) / 10;
  const testo = Number.isInteger(arrotondate)
    ? String(arrotondate)
    : arrotondate.toFixed(1).replace('.', ',');
  return `${testo} h`;
}

export function formatoPercentuale(pct: number | null): string {
  if (pct === null) return '-';
  return `${Math.round(pct)}%`;
}
