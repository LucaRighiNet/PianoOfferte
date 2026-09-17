/**
 * Date civili senza ora, rappresentate come stringa `YYYY-MM-DD`.
 *
 * Motivo: par. 14.7 del piano. Tutta la pianificazione ragiona per giorni di
 * calendario in Europe/Rome. Usare `Date` con orario introduce errori di un
 * giorno al cambio dell'ora legale e quando il server gira in UTC. Qui
 * l'aritmetica usa esclusivamente UTC su date normalizzate a mezzanotte, cosi
 * il risultato non dipende mai dal fuso del processo.
 */

/** Data civile nel formato `YYYY-MM-DD`. */
export type DataCivile = string & { readonly __brand: 'DataCivile' };

const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;

export class DataCivileNonValida extends Error {
  constructor(valore: string) {
    super(`Data civile non valida: "${valore}". Formato atteso YYYY-MM-DD.`);
    this.name = 'DataCivileNonValida';
  }
}

/** Costruisce una data civile validando formato e reale esistenza del giorno. */
export function dataCivile(valore: string): DataCivile {
  const m = FORMATO.exec(valore);
  if (!m) throw new DataCivileNonValida(valore);
  const anno = Number(m[1]);
  const mese = Number(m[2]);
  const giorno = Number(m[3]);
  if (mese < 1 || mese > 12 || giorno < 1 || giorno > 31) throw new DataCivileNonValida(valore);
  const d = new Date(Date.UTC(anno, mese - 1, giorno));
  // Intercetta il 31 febbraio e simili, che Date normalizzerebbe in silenzio.
  if (d.getUTCFullYear() !== anno || d.getUTCMonth() !== mese - 1 || d.getUTCDate() !== giorno) {
    throw new DataCivileNonValida(valore);
  }
  return valore as DataCivile;
}

/** Vero se la stringa e una data civile valida. Non solleva eccezioni. */
export function eDataCivile(valore: string): valore is DataCivile {
  try {
    dataCivile(valore);
    return true;
  } catch {
    return false;
  }
}

function aUtc(d: DataCivile): Date {
  const m = FORMATO.exec(d);
  /* c8 ignore next */
  if (!m) throw new DataCivileNonValida(d);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function daUtc(d: Date): DataCivile {
  const anno = String(d.getUTCFullYear()).padStart(4, '0');
  const mese = String(d.getUTCMonth() + 1).padStart(2, '0');
  const giorno = String(d.getUTCDate()).padStart(2, '0');
  return `${anno}-${mese}-${giorno}` as DataCivile;
}

/**
 * Converte un `Date` (istante) nella data civile corrispondente in un fuso.
 * Usato solo al confine con il database e con l'orologio di sistema.
 */
export function daIstante(istante: Date, fuso = 'Europe/Rome'): DataCivile {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dataCivile(fmt.format(istante));
}

/** Converte una data civile nell'istante di mezzanotte UTC, per la colonna DATE di Postgres. */
export function aDateUtc(d: DataCivile): Date {
  return aUtc(d);
}

export function aggiungiGiorni(d: DataCivile, giorni: number): DataCivile {
  const u = aUtc(d);
  u.setUTCDate(u.getUTCDate() + giorni);
  return daUtc(u);
}

/** Differenza in giorni: `a - b`. Positiva se `a` e successiva. */
export function differenzaGiorni(a: DataCivile, b: DataCivile): number {
  const MS_GIORNO = 86_400_000;
  return Math.round((aUtc(a).getTime() - aUtc(b).getTime()) / MS_GIORNO);
}

export function confronta(a: DataCivile, b: DataCivile): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minimo(a: DataCivile, b: DataCivile): DataCivile {
  return a <= b ? a : b;
}

export function massimo(a: DataCivile, b: DataCivile): DataCivile {
  return a >= b ? a : b;
}

/** Giorno della settimana ISO: 1 = lunedi ... 7 = domenica. */
export function giornoSettimanaIso(d: DataCivile): number {
  const g = aUtc(d).getUTCDay();
  return g === 0 ? 7 : g;
}

export function eWeekend(d: DataCivile): boolean {
  return giornoSettimanaIso(d) >= 6;
}

/** Settimana ISO 8601: inizio lunedi, la settimana 1 contiene il primo giovedi dell'anno. */
export function settimanaIso(d: DataCivile): { anno: number; settimana: number } {
  const u = aUtc(d);
  // Porta al giovedi della stessa settimana ISO.
  const giornoIso = giornoSettimanaIso(d);
  u.setUTCDate(u.getUTCDate() + (4 - giornoIso));
  const anno = u.getUTCFullYear();
  const primoGennaio = Date.UTC(anno, 0, 1);
  const settimana = Math.floor((u.getTime() - primoGennaio) / 86_400_000 / 7) + 1;
  return { anno, settimana };
}

/** Lunedi della settimana ISO che contiene `d`. */
export function inizioSettimana(d: DataCivile): DataCivile {
  return aggiungiGiorni(d, -(giornoSettimanaIso(d) - 1));
}

/** Elenco inclusivo dei giorni da `da` a `a`. Vuoto se `da` e successiva ad `a`. */
export function giorniTra(da: DataCivile, a: DataCivile): DataCivile[] {
  const risultato: DataCivile[] = [];
  const totale = differenzaGiorni(a, da);
  for (let i = 0; i <= totale; i += 1) risultato.push(aggiungiGiorni(da, i));
  return risultato;
}

/** Numero di giorni del mese di `d`. */
export function giorniNelMese(d: DataCivile): number {
  const u = aUtc(d);
  return new Date(Date.UTC(u.getUTCFullYear(), u.getUTCMonth() + 1, 0)).getUTCDate();
}
