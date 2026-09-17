'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from './ui';
import type { ModalitaAutenticazione } from '@/lib/auth/identita';
import type { Ruolo } from '@/lib/auth/permessi';

export interface PersonaAccesso {
  readonly nome: string;
  readonly cognome: string;
  readonly email: string;
  readonly colore: string;
  readonly ruolo: Ruolo;
  readonly etichettaRuolo: string;
}

/**
 * Pagina di accesso in modalita sviluppo.
 *
 * Serve anche a provare i ruoli: ciascuno vede cose diverse, e senza un modo
 * rapido per cambiare persona le regole di permesso non si verificano a mano.
 */
export function SceltaUtente({
  modalita,
  persone,
}: {
  modalita: ModalitaAutenticazione;
  persone: readonly PersonaAccesso[];
}) {
  const router = useRouter();
  const [inCorso, setInCorso] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function entra(email: string): Promise<void> {
    setInCorso(email);
    setErrore(null);
    try {
      const risposta = await fetch('/api/accesso', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!risposta.ok) {
        const dettaglio = (await risposta.json().catch(() => null)) as { errore?: string } | null;
        setErrore(dettaglio?.errore ?? 'Accesso non riuscito');
        return;
      }
      router.replace('/pianificazione');
      router.refresh();
    } catch {
      setErrore('Rete non raggiungibile');
    } finally {
      setInCorso(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div
        className="w-full max-w-[520px] rounded-lg border p-5"
        style={{
          background: 'var(--sfondo-pannello)',
          borderColor: 'var(--bordo)',
          boxShadow: 'var(--ombra-pannello)',
        }}
      >
        <p className="text-[15px] font-semibold tracking-tight">righi solutions</p>
        <h1 className="mt-0.5 text-[14px]" style={{ color: 'var(--testo-tenue)' }}>
          Pianificazione Offerte
        </h1>

        {modalita === 'easyauth' ? (
          <div className="mt-4">
            <p className="text-[13px]">
              Sei autenticato con l&apos;account aziendale, ma la tua utenza non risulta fra le
              persone censite nel portale.
            </p>
            <p className="mt-2 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
              Chiedi al responsabile di divisione di aggiungerti in Impostazioni, sezione Persone
              e capacita. Il ruolo si assegna li, non nei gruppi della directory.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
              Modalita sviluppo: scegli con quale utenza entrare. Ogni ruolo vede e puo fare cose
              diverse. In esercizio l&apos;identita arriva da Microsoft Entra ID e questa pagina
              non compare.
            </p>

            <ul className="mt-3 space-y-1">
              {persone.map((p) => (
                <li key={p.email}>
                  <button
                    type="button"
                    onClick={() => void entra(p.email)}
                    disabled={inCorso !== null}
                    className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left disabled:opacity-50"
                    style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo)' }}
                  >
                    <Avatar
                      iniziali={`${p.nome.charAt(0)}${p.cognome.charAt(0)}`}
                      colore={p.colore}
                    />
                    <span className="flex-1">
                      <span className="block text-[13px] font-medium">
                        {p.cognome} {p.nome}
                      </span>
                      <span className="block text-[11px]" style={{ color: 'var(--testo-debole)' }}>
                        {p.email}
                      </span>
                    </span>
                    <span
                      className="rounded-full border px-2 py-[1px] text-[10px]"
                      style={{ borderColor: 'var(--bordo-forte)', color: 'var(--testo-tenue)' }}
                    >
                      {p.etichettaRuolo}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {errore ? (
          <p className="mt-3 text-[12px]" role="alert" style={{ color: 'var(--semaforo-rosso)' }}>
            {errore}
          </p>
        ) : null}
      </div>
    </div>
  );
}
