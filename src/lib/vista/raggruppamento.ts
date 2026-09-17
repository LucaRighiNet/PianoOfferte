import { confronta, type DataCivile } from '@/lib/data/dataCivile';
import type { AttivitaVista, OffertaVista, PersonaVista } from '@/lib/query/piano';
import type { Raggruppamento } from './zoom';

/**
 * Costruzione delle righe di gruppo della timeline.
 *
 * Par. 1.2 del piano: con i volumi dichiarati la vista primaria e "Per risorsa",
 * che ha tante righe quante sono le persone. Le altre viste esistono ma vanno
 * usate filtrate, perche generano una riga per offerta.
 */

export interface EtichettaGruppo {
  readonly testo: string;
  readonly titolo: string;
}

export interface Gruppo {
  readonly chiave: string;
  readonly titolo: string;
  readonly sottotitolo: string | null;
  readonly colore: string;
  /** Valorizzato solo nella vista per risorsa: abilita la riga di capacita. */
  readonly personaId: string | null;
  readonly avatar: { readonly iniziali: string; readonly colore: string; readonly titolo: string } | null;
  readonly etichette: readonly EtichettaGruppo[];
  readonly attivita: readonly AttivitaVista[];
}

export interface IngressoRaggruppamento {
  readonly attivita: readonly AttivitaVista[];
  readonly offerte: ReadonlyMap<string, OffertaVista>;
  readonly persone: readonly PersonaVista[];
  readonly modo: Raggruppamento;
}

function primoInizio(attivita: readonly AttivitaVista[]): DataCivile | null {
  let minimo: DataCivile | null = null;
  for (const a of attivita) {
    if (a.dataInizio === null) continue;
    if (minimo === null || confronta(a.dataInizio, minimo) < 0) minimo = a.dataInizio;
  }
  return minimo;
}

function perChiave<T>(
  elementi: readonly AttivitaVista[],
  chiaveDi: (a: AttivitaVista) => T | null,
): Map<T, AttivitaVista[]> {
  const mappa = new Map<T, AttivitaVista[]>();
  for (const a of elementi) {
    const chiave = chiaveDi(a);
    if (chiave === null) continue;
    const elenco = mappa.get(chiave);
    if (elenco) elenco.push(a);
    else mappa.set(chiave, [a]);
  }
  return mappa;
}

export function costruisciGruppi({
  attivita,
  offerte,
  persone,
  modo,
}: IngressoRaggruppamento): readonly Gruppo[] {
  if (modo === 'RISORSA') {
    const perPersona = perChiave(attivita, (a) => a.personaId);
    // Tutte le persone attive compaiono, anche quelle senza lavoro: vedere chi
    // e libero e il motivo per cui esiste questa vista.
    return persone.map((p) => ({
      chiave: `persona:${p.id}`,
      titolo: `${p.cognome} ${p.nome}`,
      sottotitolo: null,
      colore: p.colore,
      personaId: p.id,
      avatar: { iniziali: p.iniziali, colore: p.colore, titolo: `${p.nome} ${p.cognome}` },
      etichette: [
        {
          testo: `${p.capacitaOreGiorno} h/g`,
          titolo: `Capacita giornaliera dedicata alle offerte: ${p.capacitaOreGiorno} ore${
            p.percentualeContratto === 100 ? '' : ` (contratto ${p.percentualeContratto}%)`
          }`,
        },
      ],
      attivita: perPersona.get(p.id) ?? [],
    }));
  }

  if (modo === 'OFFERTA') {
    const perOfferta = perChiave(attivita, (a) => a.offertaId);
    const gruppi: Gruppo[] = [];
    for (const [offertaId, elenco] of perOfferta) {
      const o = offerte.get(offertaId);
      if (!o) continue;
      gruppi.push({
        chiave: `offerta:${offertaId}`,
        titolo: o.descrizione,
        sottotitolo: o.codice,
        colore: o.colore,
        personaId: null,
        avatar: o.kamIniziali
          ? { iniziali: o.kamIniziali, colore: 'var(--testo-debole)', titolo: `KAM: ${o.kam ?? ''}` }
          : null,
        etichette: [
          { testo: o.cliente, titolo: `Cliente: ${o.cliente}` },
          { testo: `${elenco.length} att.`, titolo: `${elenco.length} attivita` },
        ],
        attivita: elenco,
      });
    }
    return gruppi.sort((a, b) => {
      const ia = primoInizio(a.attivita);
      const ib = primoInizio(b.attivita);
      if (ia === null && ib === null) return a.titolo.localeCompare(b.titolo, 'it');
      if (ia === null) return 1;
      if (ib === null) return -1;
      const perData = confronta(ia, ib);
      return perData !== 0 ? perData : a.chiave.localeCompare(b.chiave);
    });
  }

  // CLIENTE e KAM condividono la stessa forma: cambia solo la chiave.
  const estraiChiave = (a: AttivitaVista): string | null => {
    const o = offerte.get(a.offertaId);
    if (!o) return null;
    return modo === 'CLIENTE' ? o.clienteId : o.kamId;
  };
  const estraiTitolo = (o: OffertaVista): string =>
    modo === 'CLIENTE' ? o.cliente : (o.kam ?? 'Senza KAM');

  const raggruppate = perChiave(attivita, estraiChiave);
  const gruppi: Gruppo[] = [];
  for (const [chiave, elenco] of raggruppate) {
    const prima = elenco[0];
    if (!prima) continue;
    const o = offerte.get(prima.offertaId);
    if (!o) continue;
    const offerteDistinte = new Set(elenco.map((a) => a.offertaId));
    gruppi.push({
      chiave: `${modo.toLowerCase()}:${chiave}`,
      titolo: estraiTitolo(o),
      sottotitolo: null,
      colore: modo === 'CLIENTE' ? 'var(--accento)' : (o.colore ?? 'var(--accento)'),
      personaId: null,
      avatar:
        modo === 'KAM' && o.kamIniziali
          ? { iniziali: o.kamIniziali, colore: 'var(--testo-debole)', titolo: o.kam ?? '' }
          : null,
      etichette: [
        { testo: `${offerteDistinte.size} off.`, titolo: `${offerteDistinte.size} offerte` },
        { testo: `${elenco.length} att.`, titolo: `${elenco.length} attivita` },
      ],
      attivita: elenco,
    });
  }
  return gruppi.sort((a, b) => a.titolo.localeCompare(b.titolo, 'it'));
}
