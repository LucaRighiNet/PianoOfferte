'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { aggiungiGiorni, type DataCivile } from '@/lib/data/dataCivile';

/**
 * Trascinamento sulla timeline.
 *
 * Un solo meccanismo copre i tre gesti: assegnare una richiesta dalla coda
 * (M5), spostare una barra e ridimensionarla (M2). Par. 8.3 del piano: il
 * trascinamento e la modalita primaria di pianificazione, non un accessorio.
 *
 * Il bersaglio si determina con `elementFromPoint` sugli elementi che espongono
 * `data-corsia-persona`: cosi non serve registrare listener su ogni corsia, e
 * il gesto funziona anche mentre la pagina scorre.
 */

export type TipoGesto = 'ASSEGNA' | 'SPOSTA' | 'RIDIMENSIONA';

export interface OrigineGesto {
  readonly tipo: TipoGesto;
  readonly attivitaId: string;
  readonly versione: number;
  /** Inizio attuale della barra: assente per una richiesta ancora in coda. */
  readonly dataInizio: DataCivile | null;
  readonly stimaOre: number;
  readonly etichetta: string;
}

export interface Bersaglio {
  readonly personaId: string | null;
  /** Giorno sotto il cursore: nuovo inizio, o nuova fine se si ridimensiona. */
  readonly giorno: DataCivile | null;
}

export interface StatoTrascinamento {
  readonly origine: OrigineGesto;
  readonly bersaglio: Bersaglio;
  readonly x: number;
  readonly y: number;
  /** Il gesto ha superato la soglia: prima di allora e ancora un click. */
  readonly attivo: boolean;
}

/** Spostamento minimo prima di considerarlo un trascinamento e non un click. */
const SOGLIA_PIXEL = 4;

export interface EsitoRilascio {
  readonly origine: OrigineGesto;
  readonly bersaglio: Bersaglio;
}

export function useTrascinamento({
  larghezzaGiorno,
  finestraDa,
  onRilascio,
}: {
  larghezzaGiorno: number;
  finestraDa: DataCivile;
  onRilascio: (esito: EsitoRilascio) => void;
}) {
  const [stato, setStato] = useState<StatoTrascinamento | null>(null);
  const riferimento = useRef<{
    origine: OrigineGesto;
    xIniziale: number;
    yIniziale: number;
    attivo: boolean;
  } | null>(null);

  const calcolaBersaglio = useCallback(
    (x: number, y: number): Bersaglio => {
      const elemento = document.elementFromPoint(x, y);
      const corsia = elemento?.closest<HTMLElement>('[data-corsia-persona]') ?? null;
      if (!corsia) return { personaId: null, giorno: null };

      const personaId = corsia.dataset.corsiaPersona ?? null;
      const rettangolo = corsia.getBoundingClientRect();
      const colonna = Math.floor((x - rettangolo.left) / larghezzaGiorno);
      if (colonna < 0) return { personaId, giorno: null };

      // Il giorno sotto il cursore e l'unica informazione che il client
      // produce. Nel ridimensionamento e la nuova fine, e le ore le ricava il
      // server dal calendario reale della persona: qui non lo conosciamo, e
      // indovinare 8 ore al giorno sarebbe sbagliato per chi ne fa 4.
      return { personaId, giorno: aggiungiGiorni(finestraDa, colonna) };
    },
    [larghezzaGiorno, finestraDa],
  );

  const inizia = useCallback((origine: OrigineGesto, evento: React.PointerEvent) => {
    // Solo tasto principale: il tasto destro apre il menu contestuale.
    if (evento.button !== 0) return;
    riferimento.current = {
      origine,
      xIniziale: evento.clientX,
      yIniziale: evento.clientY,
      attivo: false,
    };
  }, []);

  useEffect(() => {
    function suMovimento(e: PointerEvent): void {
      const corrente = riferimento.current;
      if (!corrente) return;

      const distanza =
        Math.abs(e.clientX - corrente.xIniziale) + Math.abs(e.clientY - corrente.yIniziale);
      if (!corrente.attivo && distanza < SOGLIA_PIXEL) return;
      corrente.attivo = true;

      setStato({
        origine: corrente.origine,
        bersaglio: calcolaBersaglio(e.clientX, e.clientY),
        x: e.clientX,
        y: e.clientY,
        attivo: true,
      });
    }

    function suRilascio(e: PointerEvent): void {
      const corrente = riferimento.current;
      riferimento.current = null;
      setStato(null);
      if (!corrente || !corrente.attivo) return;

      const bersaglio = calcolaBersaglio(e.clientX, e.clientY);
      if (bersaglio.personaId === null || bersaglio.giorno === null) return;
      onRilascio({ origine: corrente.origine, bersaglio });
    }

    function suAnnullamento(): void {
      riferimento.current = null;
      setStato(null);
    }

    function suTasto(e: KeyboardEvent): void {
      if (e.key === 'Escape') suAnnullamento();
    }

    window.addEventListener('pointermove', suMovimento);
    window.addEventListener('pointerup', suRilascio);
    window.addEventListener('pointercancel', suAnnullamento);
    window.addEventListener('keydown', suTasto);
    return () => {
      window.removeEventListener('pointermove', suMovimento);
      window.removeEventListener('pointerup', suRilascio);
      window.removeEventListener('pointercancel', suAnnullamento);
      window.removeEventListener('keydown', suTasto);
    };
  }, [calcolaBersaglio, onRilascio]);

  return { stato, inizia };
}
