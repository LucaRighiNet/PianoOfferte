'use client';

import type { OffertaVista } from '@/lib/query/piano';
import { valutaMargine, ETICHETTE_SEMAFORO, type Semaforo } from '@/lib/offerta/rischio';
import { formatoBreve, formatoOre } from '@/lib/data/formato';
import { Avatar, Chip } from './ui';
import type { DataCivile } from '@/lib/data/dataCivile';

const COLORE_SEMAFORO: Readonly<Record<Semaforo, string>> = {
  SENZA_SCADENZA: 'var(--testo-debole)',
  VERDE: 'var(--semaforo-verde)',
  AMBRA: 'var(--semaforo-ambra)',
  ROSSO: 'var(--semaforo-rosso)',
  SFORATA: 'var(--semaforo-sforata)',
};

export interface VoceCoda {
  readonly attivitaId: string;
  readonly etichetta: string;
  readonly stimaOre: number;
  readonly offerta: OffertaVista;
}

/**
 * Coda "Da assegnare" (M5).
 *
 * Par. 3 del piano: il beta mostra solo cio che e gia in timeline, quindi la
 * domanda in ingresso resta invisibile. Questa colonna e il punto in cui il
 * responsabile decide.
 */
export function CodaDaAssegnare({
  voci,
  oggi,
  selezionata,
  onSeleziona,
}: {
  voci: readonly VoceCoda[];
  oggi: DataCivile;
  selezionata: string | null;
  onSeleziona: (id: string) => void;
}) {
  const ordinate = [...voci].sort((a, b) => {
    const sa = a.offerta.dataScadenzaCliente;
    const sb = b.offerta.dataScadenzaCliente;
    if (sa === null && sb === null) return 0;
    if (sa === null) return 1;
    if (sb === null) return -1;
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });

  return (
    <aside
      className="flex w-[260px] shrink-0 flex-col border-l"
      style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
    >
      <header
        className="sticky top-0 flex items-baseline justify-between border-b px-3 py-2"
        style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
      >
        <h2 className="text-[12px] font-semibold">Da assegnare</h2>
        <span className="text-[11px]" style={{ color: 'var(--testo-debole)' }}>
          {ordinate.length}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        {ordinate.length === 0 ? (
          <p className="px-3 py-4 text-[12px]" style={{ color: 'var(--testo-debole)' }}>
            Nessuna richiesta in attesa di assegnazione.
          </p>
        ) : (
          <ul>
            {ordinate.map((v) => {
              const margine = valutaMargine(oggi, v.offerta.dataScadenzaCliente);
              return (
                <li key={v.attivitaId}>
                  <button
                    type="button"
                    onClick={() => onSeleziona(v.attivitaId)}
                    className="w-full border-b px-3 py-2 text-left transition-colors"
                    style={{
                      borderColor: 'var(--bordo)',
                      background:
                        selezionata === v.attivitaId ? 'var(--sfondo-hover)' : 'transparent',
                    }}
                  >
                    <div className="flex items-start gap-1.5">
                      <span
                        aria-hidden="true"
                        className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
                        style={{ background: v.offerta.colore }}
                      />
                      <span className="flex-1 truncate text-[12px] font-medium">
                        {v.offerta.descrizione}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Chip titolo={`Cliente: ${v.offerta.cliente}`}>{v.offerta.cliente}</Chip>
                      {v.offerta.kamIniziali ? (
                        <Avatar
                          iniziali={v.offerta.kamIniziali}
                          colore="var(--testo-debole)"
                          titolo={`KAM: ${v.offerta.kam ?? ''}`}
                        />
                      ) : null}
                    </div>
                    <div
                      className="mt-1 flex items-center justify-between text-[11px]"
                      style={{ color: 'var(--testo-tenue)' }}
                    >
                      <span>
                        {v.etichetta} · {formatoOre(v.stimaOre)}
                      </span>
                      <span
                        title={ETICHETTE_SEMAFORO[margine.semaforo]}
                        style={{ color: COLORE_SEMAFORO[margine.semaforo], fontWeight: 600 }}
                      >
                        {v.offerta.dataScadenzaCliente
                          ? formatoBreve(v.offerta.dataScadenzaCliente)
                          : 'senza scadenza'}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
