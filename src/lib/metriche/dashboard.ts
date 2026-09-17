import { confronta, differenzaGiorni, type DataCivile } from '@/lib/data/dataCivile';

/**
 * Metriche della dashboard direzionale (S1).
 *
 * Par. 9 del piano: quattro domande, quattro risposte. Niente muro di grafici.
 * Il riquadro sugli esiti commerciali resta escluso per la decisione D7: qui si
 * misura efficienza operativa, non efficacia commerciale.
 */

export interface OffertaMisurabile {
  readonly id: string;
  readonly codice: string;
  readonly descrizione: string;
  readonly cliente: string;
  readonly tipoOfferta: string | null;
  readonly dataRichiesta: DataCivile;
  readonly dataScadenzaCliente: DataCivile | null;
  /** Fine dell'ultima attivita pianificata. `null` se non pianificata. */
  readonly dataFinePianificata: DataCivile | null;
  readonly consegnata: boolean;
  readonly bloccata: boolean;
  readonly causaleBlocco: string | null;
  readonly personaId: string | null;
  readonly persona: string | null;
}

/** Mediana di un elenco. `null` se vuoto. Non altera l'elenco ricevuto. */
export function mediana(valori: readonly number[]): number | null {
  if (valori.length === 0) return null;
  const ordinati = [...valori].sort((a, b) => a - b);
  const meta = Math.floor(ordinati.length / 2);
  if (ordinati.length % 2 === 1) return ordinati[meta] ?? null;
  const sinistra = ordinati[meta - 1];
  const destra = ordinati[meta];
  if (sinistra === undefined || destra === undefined) return null;
  return (sinistra + destra) / 2;
}

/**
 * Tempo di preparazione in giorni di calendario, dalla richiesta alla fine
 * pianificata. Si misura in giorni di calendario perche e il tempo che il
 * cliente percepisce, non quello che noi lavoriamo.
 */
export function leadTime(offerta: OffertaMisurabile): number | null {
  if (!offerta.consegnata || offerta.dataFinePianificata === null) return null;
  const giorni = differenzaGiorni(offerta.dataFinePianificata, offerta.dataRichiesta);
  return giorni >= 0 ? giorni : null;
}

export interface RiepilogoLeadTime {
  readonly mediana: number | null;
  readonly campione: number;
}

export function leadTimeComplessivo(
  offerte: readonly OffertaMisurabile[],
): RiepilogoLeadTime {
  const valori = offerte.map(leadTime).filter((v): v is number => v !== null);
  return { mediana: mediana(valori), campione: valori.length };
}

/** Lead time mediano per tipo di offerta, dal piu lento al piu rapido. */
export function leadTimePerTipo(
  offerte: readonly OffertaMisurabile[],
): readonly { readonly tipo: string; readonly mediana: number; readonly campione: number }[] {
  const perTipo = new Map<string, number[]>();
  for (const o of offerte) {
    const valore = leadTime(o);
    if (valore === null) continue;
    const chiave = o.tipoOfferta ?? 'Senza tipo';
    const elenco = perTipo.get(chiave);
    if (elenco) elenco.push(valore);
    else perTipo.set(chiave, [valore]);
  }

  const righe: { tipo: string; mediana: number; campione: number }[] = [];
  for (const [tipo, valori] of perTipo) {
    const m = mediana(valori);
    if (m === null) continue;
    righe.push({ tipo, mediana: m, campione: valori.length });
  }
  return righe.sort((a, b) => b.mediana - a.mediana);
}

export interface Puntualita {
  readonly consegnateInTempo: number;
  readonly consegnateTotali: number;
  /** Percentuale, o `null` se non ci sono consegne con scadenza nota. */
  readonly percentuale: number | null;
}

/**
 * Quota di offerte consegnate entro la scadenza del cliente.
 * Le offerte senza scadenza non entrano nel conteggio: non avendo un termine,
 * includerle gonfierebbe il risultato.
 */
export function puntualita(offerte: readonly OffertaMisurabile[]): Puntualita {
  let inTempo = 0;
  let totali = 0;
  for (const o of offerte) {
    if (!o.consegnata) continue;
    if (o.dataScadenzaCliente === null || o.dataFinePianificata === null) continue;
    totali += 1;
    if (confronta(o.dataFinePianificata, o.dataScadenzaCliente) <= 0) inTempo += 1;
  }
  return {
    consegnateInTempo: inTempo,
    consegnateTotali: totali,
    percentuale: totali === 0 ? null : Math.round((inTempo / totali) * 1000) / 10,
  };
}

export interface VoceRischio {
  readonly offerta: OffertaMisurabile;
  /** Giorni di calendario fra la fine pianificata e la scadenza. */
  readonly margine: number;
  readonly bloccata: boolean;
}

/**
 * Offerte non ancora consegnate ordinate per margine crescente: in cima quelle
 * gia oltre la scadenza. Risponde alla domanda "cosa salta".
 */
export function offerteARischio(
  offerte: readonly OffertaMisurabile[],
  margineMassimo: number,
): readonly VoceRischio[] {
  const voci: VoceRischio[] = [];
  for (const o of offerte) {
    if (o.consegnata) continue;
    if (o.dataScadenzaCliente === null || o.dataFinePianificata === null) continue;
    const margine = differenzaGiorni(o.dataScadenzaCliente, o.dataFinePianificata);
    if (margine > margineMassimo) continue;
    voci.push({ offerta: o, margine, bloccata: o.bloccata });
  }
  return voci.sort((a, b) => {
    if (a.margine !== b.margine) return a.margine - b.margine;
    return a.offerta.codice.localeCompare(b.offerta.codice);
  });
}

export interface VoceWip {
  readonly personaId: string;
  readonly persona: string;
  readonly aperte: number;
  readonly limite: number;
  readonly oltreIlLimite: boolean;
  /** Giorni dalla presa in carico dell'attivita aperta piu vecchia. */
  readonly anzianitaMassima: number | null;
}

export function ordinaWip(voci: readonly VoceWip[]): readonly VoceWip[] {
  return [...voci].sort((a, b) => {
    if (a.oltreIlLimite !== b.oltreIlLimite) return a.oltreIlLimite ? -1 : 1;
    if (a.aperte !== b.aperte) return b.aperte - a.aperte;
    return a.persona.localeCompare(b.persona, 'it');
  });
}
