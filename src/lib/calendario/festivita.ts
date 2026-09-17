import { dataCivile, type DataCivile } from '@/lib/data/dataCivile';

/**
 * Festivita civili italiane.
 *
 * Il patrono non e incluso: varia per sede (Cesena, Bologna, Parma hanno patroni
 * diversi) e va configurato come chiusura aziendale, non dedotto dal codice.
 */

/**
 * Domenica di Pasqua secondo l'algoritmo gregoriano di Meeus/Jones/Butcher.
 * Valido per il calendario gregoriano, quindi per ogni anno che interessa qui.
 */
export function domenicaDiPasqua(anno: number): DataCivile {
  const a = anno % 19;
  const b = Math.floor(anno / 100);
  const c = anno % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31);
  const giorno = ((h + l - 7 * m + 114) % 31) + 1;
  return dataCivile(
    `${anno}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`,
  );
}

/** Lunedi dell'Angelo, il giorno dopo Pasqua. */
export function lunediDellAngelo(anno: number): DataCivile {
  const pasqua = domenicaDiPasqua(anno);
  const [y, m, d] = pasqua.split('-').map(Number) as [number, number, number];
  const successivo = new Date(Date.UTC(y, m - 1, d + 1));
  return dataCivile(
    `${successivo.getUTCFullYear()}-${String(successivo.getUTCMonth() + 1).padStart(2, '0')}-${String(
      successivo.getUTCDate(),
    ).padStart(2, '0')}`,
  );
}

const FISSE: ReadonlyArray<readonly [number, number, string]> = [
  [1, 1, 'Capodanno'],
  [1, 6, 'Epifania'],
  [4, 25, 'Liberazione'],
  [5, 1, 'Festa del lavoro'],
  [6, 2, 'Festa della Repubblica'],
  [8, 15, 'Ferragosto'],
  [11, 1, 'Ognissanti'],
  [12, 8, 'Immacolata'],
  [12, 25, 'Natale'],
  [12, 26, 'Santo Stefano'],
];

/** Festivita civili italiane di un anno, con il nome, ordinate per data. */
export function festivitaItaliane(anno: number): ReadonlyMap<DataCivile, string> {
  const mappa = new Map<DataCivile, string>();
  for (const [mese, giorno, nome] of FISSE) {
    mappa.set(
      dataCivile(`${anno}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`),
      nome,
    );
  }
  mappa.set(lunediDellAngelo(anno), "Lunedi dell'Angelo");
  return new Map([...mappa].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/**
 * Indice delle festivita per un intervallo di anni, costruito una volta sola.
 * L'insieme e volutamente piccolo: al massimo 11 voci per anno.
 */
export function indiceFestivita(annoDa: number, annoA: number): ReadonlyMap<DataCivile, string> {
  const mappa = new Map<DataCivile, string>();
  for (let anno = annoDa; anno <= annoA; anno += 1) {
    for (const [data, nome] of festivitaItaliane(anno)) mappa.set(data, nome);
  }
  return mappa;
}
