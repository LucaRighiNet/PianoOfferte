'use client';

import type { TipoAttivitaVista } from '@/lib/query/piano';

/**
 * Legenda dei colori.
 *
 * Senza legenda una codifica cromatica e solo decorazione: chi guarda non puo
 * decodificarla. Occupa una riga sottile perche va letta una volta e poi
 * dimenticata.
 */
export function Legenda({ tipi }: { tipi: readonly TipoAttivitaVista[] }) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-3 py-1"
      style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-tenue)' }}
    >
      <Sezione titolo="Attivita">
        {tipi.map((t) => (
          <Voce key={t.id} etichetta={t.nome}>
            <span
              className="h-2.5 w-4 rounded-[2px]"
              style={{ background: t.colore }}
              aria-hidden="true"
            />
          </Voce>
        ))}
      </Sezione>

      <Sezione titolo="Stato">
        <Voce etichetta="Non iniziata">
          <span
            className="h-2.5 w-4 rounded-[2px]"
            style={{ background: 'var(--testo-debole)', opacity: 0.68, border: '1px dashed rgba(0,0,0,0.35)' }}
            aria-hidden="true"
          />
        </Voce>
        <Voce etichetta="Bloccata">
          <span
            className="h-2.5 w-4 rounded-[2px]"
            style={{ background: 'var(--testo-debole)', border: '1.5px dashed var(--semaforo-ambra)' }}
            aria-hidden="true"
          />
        </Voce>
        <Voce etichetta="In ritardo">
          <span
            className="h-2.5 w-4 rounded-[2px]"
            style={{ background: 'var(--testo-debole)', border: '1.5px solid var(--semaforo-rosso)' }}
            aria-hidden="true"
          />
        </Voce>
        <Voce etichetta="Completata">
          <span
            className="h-2.5 w-4 rounded-[2px]"
            style={{ background: 'var(--testo-debole)', opacity: 0.38 }}
            aria-hidden="true"
          />
        </Voce>
        <Voce etichetta="Senza margine sulla scadenza">
          <span
            className="flex h-2.5 w-4 justify-end rounded-[2px]"
            style={{ background: 'var(--testo-debole)' }}
            aria-hidden="true"
          >
            <span className="h-full w-1" style={{ background: 'var(--semaforo-rosso)' }} />
          </span>
        </Voce>
      </Sezione>

      <Sezione titolo="Carico">
        <Voce etichetta="fino 40%">
          <Pastiglia colore="var(--carico-scarico)" />
        </Voce>
        <Voce etichetta="41-85%">
          <Pastiglia colore="var(--carico-sano)" />
        </Voce>
        <Voce etichetta="86-100%">
          <Pastiglia colore="var(--carico-pieno)" />
        </Voce>
        <Voce etichetta="oltre 100%">
          <Pastiglia colore="var(--carico-sovraccarico)" />
        </Voce>
        <Voce etichetta="non lavorativo">
          <span
            className="h-2.5 w-3 rounded-[2px]"
            style={{
              background:
                'repeating-linear-gradient(45deg, var(--carico-non-lavorativo) 0 3px, transparent 3px 6px)',
              border: '1px solid var(--bordo)',
            }}
            aria-hidden="true"
          />
        </Voce>
      </Sezione>
    </div>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[9px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--testo-debole)' }}
      >
        {titolo}
      </span>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">{children}</div>
    </div>
  );
}

function Voce({ etichetta, children }: { etichetta: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--testo-tenue)' }}>
      {children}
      {etichetta}
    </span>
  );
}

function Pastiglia({ colore }: { colore: string }) {
  return (
    <span
      className="h-2.5 w-3 rounded-[2px]"
      style={{ background: colore }}
      aria-hidden="true"
    />
  );
}
