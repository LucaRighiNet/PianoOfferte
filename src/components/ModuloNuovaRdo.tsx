'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PianoDati } from '@/lib/query/piano';
import { formatoOre } from '@/lib/data/formato';
import { aggiungiGiorni, type DataCivile } from '@/lib/data/dataCivile';
import { Pulsante } from './ui';

/**
 * Inserimento rapido di una richiesta di offerta (M8).
 *
 * Obiettivo dichiarato: sotto i 30 secondi, meno di sei interazioni.
 * Per questo il modulo ha cinque campi, di cui tre precompilati, il tipo di
 * offerta genera da solo le attivita con le loro stime, e il cliente si puo
 * creare digitandone il nome senza uscire di qui.
 */

const SCADENZA_PREDEFINITA_GIORNI = 14;

export function ModuloNuovaRdo({
  dati,
  onChiudi,
  onCreata,
}: {
  dati: PianoDati;
  onChiudi: () => void;
  onCreata: (codice: string) => void;
}) {
  const idModulo = useId();
  const primoCampo = useRef<HTMLInputElement>(null);

  const [descrizione, setDescrizione] = useState('');
  const [cliente, setCliente] = useState('');
  const [tipoOffertaId, setTipoOffertaId] = useState(dati.tipiOfferta[0]?.id ?? '');
  const [kamId, setKamId] = useState('');
  const [scadenza, setScadenza] = useState<DataCivile>(
    aggiungiGiorni(dati.oggi, SCADENZA_PREDEFINITA_GIORNI),
  );
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    primoCampo.current?.focus();
  }, []);

  useEffect(() => {
    function suTasto(e: KeyboardEvent): void {
      if (e.key === 'Escape') onChiudi();
    }
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, [onChiudi]);

  const tipoScelto = useMemo(
    () => dati.tipiOfferta.find((t) => t.id === tipoOffertaId) ?? null,
    [dati.tipiOfferta, tipoOffertaId],
  );

  const clienteEsistente = useMemo(
    () => dati.clienti.find((c) => c.nome.toLowerCase() === cliente.trim().toLowerCase()) ?? null,
    [dati.clienti, cliente],
  );

  const invia = useCallback(
    async (evento: React.FormEvent) => {
      evento.preventDefault();
      if (inCorso) return;
      setErrore(null);
      setInCorso(true);

      try {
        const risposta = await fetch('/api/offerte', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            descrizione: descrizione.trim(),
            ...(clienteEsistente
              ? { clienteId: clienteEsistente.id }
              : { clienteNome: cliente.trim() }),
            tipoOffertaId,
            kamId: kamId === '' ? null : kamId,
            dataScadenzaCliente: scadenza,
          }),
        });

        if (!risposta.ok) {
          const corpo = (await risposta.json().catch(() => null)) as { errore?: string } | null;
          setErrore(corpo?.errore ?? `Creazione non riuscita (${risposta.status})`);
          return;
        }

        const creata = (await risposta.json()) as { codice: string };
        onCreata(creata.codice);
      } catch {
        setErrore('Rete non raggiungibile: la richiesta non e stata salvata');
      } finally {
        setInCorso(false);
      }
    },
    [inCorso, descrizione, clienteEsistente, cliente, tipoOffertaId, kamId, scadenza, onCreata],
  );

  const completo = descrizione.trim().length >= 3 && cliente.trim().length >= 2 && tipoOffertaId !== '';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-6"
      style={{ background: 'rgba(15, 23, 42, 0.45)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onChiudi();
      }}
    >
      <form
        onSubmit={invia}
        aria-labelledby={`${idModulo}-titolo`}
        className="mt-[8vh] w-full max-w-[560px] rounded-lg border p-4"
        style={{
          background: 'var(--sfondo-pannello)',
          borderColor: 'var(--bordo-forte)',
          boxShadow: 'var(--ombra-pannello)',
        }}
      >
        <h2 id={`${idModulo}-titolo`} className="text-[14px] font-semibold">
          Nuova richiesta di offerta
        </h2>
        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--testo-debole)' }}>
          Le attivita nascono dal tipo di offerta e finiscono nella coda Da assegnare.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Campo etichetta="Descrizione" larghezzaPiena>
            <input
              ref={primoCampo}
              type="text"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Quadri elettrici BT"
              maxLength={200}
              list={`${idModulo}-descrizioni`}
              className="h-8 w-full rounded-md border px-2 text-[13px]"
              style={{
                background: 'var(--sfondo)',
                borderColor: 'var(--bordo)',
                color: 'var(--testo)',
              }}
            />
            <datalist id={`${idModulo}-descrizioni`}>
              {[...new Set(dati.offerte.map((o) => o.descrizione))].slice(0, 30).map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Campo>

          <Campo
            etichetta="Cliente"
            nota={
              cliente.trim() !== '' && clienteEsistente === null
                ? 'Verra creato come nuovo cliente'
                : undefined
            }
          >
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Cummins"
              maxLength={120}
              list={`${idModulo}-clienti`}
              className="h-8 w-full rounded-md border px-2 text-[13px]"
              style={{
                background: 'var(--sfondo)',
                borderColor: 'var(--bordo)',
                color: 'var(--testo)',
              }}
            />
            <datalist id={`${idModulo}-clienti`}>
              {dati.clienti.map((c) => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
          </Campo>

          <Campo etichetta="Scadenza cliente">
            <input
              type="date"
              value={scadenza}
              onChange={(e) => setScadenza(e.target.value as DataCivile)}
              className="h-8 w-full rounded-md border px-2 text-[13px]"
              style={{
                background: 'var(--sfondo)',
                borderColor: 'var(--bordo)',
                color: 'var(--testo)',
              }}
            />
          </Campo>

          <Campo etichetta="Tipo di offerta">
            <select
              value={tipoOffertaId}
              onChange={(e) => setTipoOffertaId(e.target.value)}
              className="h-8 w-full rounded-md border px-2 text-[13px]"
              style={{
                background: 'var(--sfondo)',
                borderColor: 'var(--bordo)',
                color: 'var(--testo)',
              }}
            >
              {dati.tipiOfferta.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etichetta="KAM">
            <select
              value={kamId}
              onChange={(e) => setKamId(e.target.value)}
              className="h-8 w-full rounded-md border px-2 text-[13px]"
              style={{
                background: 'var(--sfondo)',
                borderColor: 'var(--bordo)',
                color: 'var(--testo)',
              }}
            >
              <option value="">Nessuno</option>
              {dati.persone.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.cognome} {p.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        {tipoScelto ? (
          <div
            className="mt-3 rounded-md border px-3 py-2"
            style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-tenue)' }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--testo-debole)' }}
            >
              Attivita che verranno create
            </p>
            <ul className="mt-1 space-y-0.5">
              {tipoScelto.righe.map((r, i) => (
                <li
                  key={`${r.tipoAttivita}-${i}`}
                  className="flex justify-between text-[12px]"
                  style={{ color: 'var(--testo-tenue)' }}
                >
                  <span>
                    {i + 1}. {r.tipoAttivita}
                  </span>
                  <span>{formatoOre(r.stimaOre)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11px]" style={{ color: 'var(--testo-tenue)' }}>
              Totale stimato {formatoOre(tipoScelto.oreTotali)}. Le stime sono modificabili dopo
              l&apos;assegnazione.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-[12px]" style={{ color: 'var(--semaforo-ambra)' }}>
            Nessun tipo di offerta configurato: senza template non si possono creare attivita.
          </p>
        )}

        {errore ? (
          <p
            className="mt-3 rounded-md px-3 py-2 text-[12px]"
            role="alert"
            style={{ background: 'var(--festivita)', color: 'var(--semaforo-rosso)' }}
          >
            {errore}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Pulsante onClick={onChiudi} titolo="Annulla (Esc)">
            Annulla
          </Pulsante>
          <button
            type="submit"
            disabled={!completo || inCorso}
            className="inline-flex h-7 items-center rounded-md border px-3 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'var(--accento)', borderColor: 'var(--accento)', color: '#fff' }}
          >
            {inCorso ? 'Creazione…' : 'Crea richiesta'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Campo({
  etichetta,
  nota,
  larghezzaPiena = false,
  children,
}: {
  etichetta: string;
  nota?: string;
  larghezzaPiena?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={larghezzaPiena ? 'col-span-2 block' : 'block'}>
      <span
        className="mb-1 block text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--testo-debole)' }}
      >
        {etichetta}
      </span>
      {children}
      {nota ? (
        <span className="mt-0.5 block text-[10px]" style={{ color: 'var(--accento)' }}>
          {nota}
        </span>
      ) : null}
    </label>
  );
}
