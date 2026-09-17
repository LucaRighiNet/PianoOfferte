'use client';

import { useMemo } from 'react';
import {
  eWeekend,
  giornoSettimanaIso,
  settimanaIso,
  type DataCivile,
} from '@/lib/data/dataCivile';
import { anno, INIZIALI_GIORNI, nomeMese, numeroGiorno } from '@/lib/data/formato';

export interface GiornoVista {
  readonly data: DataCivile;
  readonly weekend: boolean;
  readonly festivita: string | null;
  readonly oggi: boolean;
  readonly inizioSettimana: boolean;
}

interface Blocco {
  readonly chiave: string;
  readonly etichetta: string;
  readonly colonne: number;
}

function raggruppa(
  giorni: readonly GiornoVista[],
  chiaveDi: (g: GiornoVista) => string,
  etichettaDi: (g: GiornoVista) => string,
): Blocco[] {
  const blocchi: Blocco[] = [];
  for (const g of giorni) {
    const chiave = chiaveDi(g);
    const ultimo = blocchi[blocchi.length - 1];
    if (ultimo && ultimo.chiave === chiave) {
      blocchi[blocchi.length - 1] = { ...ultimo, colonne: ultimo.colonne + 1 };
    } else {
      blocchi.push({ chiave, etichetta: etichettaDi(g), colonne: 1 });
    }
  }
  return blocchi;
}

export function IntestazioneTempo({
  giorni,
  larghezzaGiorno,
  mostraGiorni,
}: {
  giorni: readonly GiornoVista[];
  larghezzaGiorno: number;
  mostraGiorni: boolean;
}) {
  const mesi = useMemo(
    () =>
      raggruppa(
        giorni,
        (g) => g.data.slice(0, 7),
        (g) => `${nomeMese(g.data)} ${anno(g.data)}`,
      ),
    [giorni],
  );

  const settimane = useMemo(
    () =>
      raggruppa(
        giorni,
        (g) => {
          const s = settimanaIso(g.data);
          return `${s.anno}-${s.settimana}`;
        },
        (g) => `W${settimanaIso(g.data).settimana}`,
      ),
    [giorni],
  );

  return (
    <div
      className="sticky top-0 z-30 select-none"
      style={{ background: 'var(--sfondo-pannello)' }}
    >
      <Fascia blocchi={mesi} larghezzaGiorno={larghezzaGiorno} altezza={22} forte />
      <Fascia blocchi={settimane} larghezzaGiorno={larghezzaGiorno} altezza={18} />
      {mostraGiorni ? (
        <div className="flex" style={{ borderBottom: '1px solid var(--bordo-forte)' }}>
          {giorni.map((g) => (
            <div
              key={g.data}
              className="fascia-giorno flex flex-col items-center justify-center"
              data-weekend={g.weekend}
              data-festivita={g.festivita !== null}
              data-oggi={g.oggi}
              data-inizio-settimana={g.inizioSettimana}
              style={{ width: larghezzaGiorno, height: 34 }}
              title={g.festivita ?? undefined}
            >
              <span
                className="text-[9px] leading-[11px]"
                style={{ color: 'var(--testo-debole)' }}
              >
                {INIZIALI_GIORNI[giornoSettimanaIso(g.data)]}
              </span>
              <span
                className="text-[11px] leading-[14px]"
                style={{
                  color: g.oggi ? '#fff' : 'var(--testo-tenue)',
                  background: g.oggi ? 'var(--oggi)' : 'transparent',
                  borderRadius: 4,
                  padding: g.oggi ? '0 4px' : 0,
                  fontWeight: g.oggi ? 600 : 400,
                }}
              >
                {numeroGiorno(g.data)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex" style={{ borderBottom: '1px solid var(--bordo-forte)' }}>
          {giorni.map((g) => (
            <div
              key={g.data}
              className="fascia-giorno"
              data-weekend={eWeekend(g.data)}
              data-festivita={g.festivita !== null}
              data-oggi={g.oggi}
              data-inizio-settimana={g.inizioSettimana}
              style={{ width: larghezzaGiorno, height: 10 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Fascia({
  blocchi,
  larghezzaGiorno,
  altezza,
  forte = false,
}: {
  blocchi: readonly Blocco[];
  larghezzaGiorno: number;
  altezza: number;
  forte?: boolean;
}) {
  return (
    <div className="flex" style={{ borderBottom: '1px solid var(--bordo)' }}>
      {blocchi.map((b) => (
        <div
          key={b.chiave}
          className="overflow-hidden whitespace-nowrap px-2 text-[11px]"
          style={{
            width: b.colonne * larghezzaGiorno,
            height: altezza,
            lineHeight: `${altezza}px`,
            borderRight: '1px solid var(--bordo-forte)',
            color: forte ? 'var(--testo)' : 'var(--testo-tenue)',
            fontWeight: forte ? 600 : 500,
            textAlign: 'center',
          }}
        >
          {b.etichetta}
        </div>
      ))}
    </div>
  );
}
