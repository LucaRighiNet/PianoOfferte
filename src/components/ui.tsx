'use client';

import type { ReactNode } from 'react';

export function Chip({
  children,
  titolo,
  colore,
  pieno = false,
}: {
  children: ReactNode;
  titolo?: string;
  colore?: string;
  /** Riempita: per l'informazione che va letta per prima, come il cliente. */
  pieno?: boolean;
}) {
  return (
    <span
      title={titolo}
      className="inline-flex max-w-[11rem] items-center gap-1 truncate rounded-full border px-2 py-[1px] text-[11px] leading-[16px]"
      style={
        pieno
          ? {
              background: 'var(--sfondo-hover)',
              borderColor: 'var(--bordo-forte)',
              color: 'var(--testo)',
              fontWeight: 600,
            }
          : {
              borderColor: colore ?? 'var(--bordo-forte)',
              color: colore ?? 'var(--testo-tenue)',
            }
      }
    >
      {children}
    </span>
  );
}

export function Avatar({ iniziali, colore, titolo }: { iniziali: string; colore: string; titolo?: string }) {
  return (
    <span
      title={titolo}
      aria-hidden="true"
      className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
      style={{ background: colore }}
    >
      {iniziali}
    </span>
  );
}

export function Pulsante({
  children,
  onClick,
  attivo = false,
  titolo,
  disabilitato = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  attivo?: boolean;
  titolo?: string;
  disabilitato?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titolo}
      aria-pressed={onClick ? attivo : undefined}
      disabled={disabilitato}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        background: attivo ? 'var(--accento)' : 'var(--sfondo-pannello)',
        color: attivo ? '#fff' : 'var(--testo)',
        borderColor: attivo ? 'var(--accento)' : 'var(--bordo)',
      }}
    >
      {children}
    </button>
  );
}

export function GruppoSegmentato<T extends string>({
  valori,
  etichette,
  selezionato,
  onCambia,
}: {
  valori: readonly T[];
  etichette: Readonly<Record<T, string>>;
  selezionato: T;
  onCambia: (v: T) => void;
}) {
  return (
    <div
      role="group"
      className="inline-flex overflow-hidden rounded-md border"
      style={{ borderColor: 'var(--bordo)' }}
    >
      {valori.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onCambia(v)}
          aria-pressed={v === selezionato}
          className="h-7 border-r px-2.5 text-[12px] font-medium transition-colors last:border-r-0"
          style={{
            background: v === selezionato ? 'var(--accento)' : 'var(--sfondo-pannello)',
            color: v === selezionato ? '#fff' : 'var(--testo-tenue)',
            borderColor: 'var(--bordo)',
          }}
        >
          {etichette[v]}
        </button>
      ))}
    </div>
  );
}

export function Selettore<T extends string>({
  etichetta,
  valore,
  opzioni,
  onCambia,
}: {
  etichetta: string;
  valore: T | '';
  opzioni: readonly { readonly valore: T; readonly testo: string }[];
  onCambia: (v: T | '') => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--testo-debole)' }}>
        {etichetta}
      </span>
      <select
        value={valore}
        onChange={(e) => onCambia(e.target.value as T | '')}
        className="h-7 max-w-[11rem] truncate rounded-md border px-2 text-[12px]"
        style={{
          background: 'var(--sfondo-pannello)',
          color: 'var(--testo)',
          borderColor: 'var(--bordo)',
        }}
      >
        <option value="">Tutti</option>
        {opzioni.map((o) => (
          <option key={o.valore} value={o.valore}>
            {o.testo}
          </option>
        ))}
      </select>
    </label>
  );
}
