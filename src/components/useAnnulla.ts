'use client';

import { useCallback, useState } from 'react';
import type { DataCivile } from '@/lib/data/dataCivile';
import type { StatoAttivitaMemorizzato } from '@/lib/offerta/rischio';

/**
 * Pila di annullamento delle azioni di pianificazione.
 *
 * Par. 8.3 del piano: "Annulla sempre disponibile sulle ultime azioni". In una
 * interfaccia dove si pianifica trascinando, un rilascio sbagliato e questione
 * di mezzo secondo: senza annulla l'utente deve ricostruire a mano dove stava
 * la barra, e spesso non se lo ricorda.
 *
 * Ogni voce porta con se lo stato PRECEDENTE dell'attivita e la versione
 * corrente restituita dal server. Annullare e una normale modifica, quindi
 * passa dagli stessi controlli di concorrenza: se nel frattempo ha modificato
 * qualcun altro, l'annulla viene rifiutato invece di sovrascrivere.
 */

export interface RipristinoPianificazione {
  readonly tipo: 'PIANIFICAZIONE';
  readonly personaId: string | null;
  readonly dataInizio: DataCivile | null;
  readonly stimaOre: number;
}

export interface RipristinoStato {
  readonly tipo: 'STATO';
  readonly stato: StatoAttivitaMemorizzato;
  readonly causaleBlocco: string | null;
}

export type Ripristino = RipristinoPianificazione | RipristinoStato;

export interface AzioneAnnullabile {
  readonly attivitaId: string;
  readonly descrizione: string;
  readonly ripristino: Ripristino;
  /** Versione dell'attivita dopo l'azione: serve per annullarla. */
  readonly versione: number;
}

/** Oltre questa profondita l'annulla smette di essere prevedibile. */
const PROFONDITA_MASSIMA = 10;

export function useAnnulla() {
  const [pila, setPila] = useState<readonly AzioneAnnullabile[]>([]);

  const registra = useCallback((azione: AzioneAnnullabile) => {
    setPila((precedente) => [...precedente, azione].slice(-PROFONDITA_MASSIMA));
  }, []);

  /**
   * Toglie l'ultima azione dalla pila. Chi annulla legge `ultima` prima di
   * chiamarla: leggere lo stato dentro un aggiornatore sarebbe inaffidabile,
   * perche React puo invocarlo due volte in sviluppo.
   */
  const rimuoviUltima = useCallback(() => {
    setPila((precedente) => precedente.slice(0, -1));
  }, []);

  const svuota = useCallback(() => setPila([]), []);

  /**
   * Aggiorna la versione registrata per una attivita: serve quando il server
   * riprogramma una catena e restituisce versioni nuove anche per righe che
   * l'utente non ha toccato.
   */
  const aggiornaVersione = useCallback((attivitaId: string, versione: number) => {
    setPila((precedente) =>
      precedente.map((a) => (a.attivitaId === attivitaId ? { ...a, versione } : a)),
    );
  }, []);

  return {
    pila,
    ultima: pila[pila.length - 1] ?? null,
    registra,
    rimuoviUltima,
    svuota,
    aggiornaVersione,
  };
}
