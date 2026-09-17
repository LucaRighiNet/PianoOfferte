'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  DatiImpostazioni,
  IndisponibilitaImpostazioni,
  PersonaImpostazioni,
  TipoAttivitaImpostazioni,
} from '@/lib/query/impostazioni';
import { formatoBreve, formatoOre } from '@/lib/data/formato';
import { aggiungiGiorni, type DataCivile } from '@/lib/data/dataCivile';
import { Pulsante } from './ui';

/**
 * Impostazioni (M4).
 *
 * Contiene solo cio che, se sbagliato, rende falsa la heatmap: la capacita
 * reale delle persone, il calendario delle assenze e le stime predefinite.
 * Tutto il resto resta fuori finche non serve davvero.
 */

const ETICHETTE_TIPO: Readonly<Record<string, string>> = {
  FERIE: 'Ferie',
  PERMESSO: 'Permesso',
  FESTIVITA: 'Festivita',
  CHIUSURA_AZIENDALE: 'Chiusura aziendale',
  FORMAZIONE: 'Formazione',
  CARICO_NON_OFFERTA: 'Carico non-offerta',
};

type Sezione = 'PERSONE' | 'CALENDARIO' | 'TIPI';

export function Impostazioni({ dati }: { dati: DatiImpostazioni }) {
  const router = useRouter();
  const [sezione, setSezione] = useState<Sezione>('PERSONE');
  const [messaggio, setMessaggio] = useState<{ testo: string; errore: boolean } | null>(null);

  const chiama = useCallback(
    async (url: string, metodo: string, corpo?: unknown): Promise<boolean> => {
      try {
        const risposta = await fetch(url, {
          method: metodo,
          headers: corpo === undefined ? {} : { 'content-type': 'application/json' },
          ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
        });
        if (!risposta.ok) {
          const dettaglio = (await risposta.json().catch(() => null)) as { errore?: string } | null;
          setMessaggio({
            testo: dettaglio?.errore ?? `Operazione non riuscita (${risposta.status})`,
            errore: true,
          });
          return false;
        }
        setMessaggio({ testo: 'Salvato', errore: false });
        router.refresh();
        return true;
      } catch {
        setMessaggio({ testo: 'Rete non raggiungibile', errore: true });
        return false;
      }
    },
    [router],
  );

  return (
    <div className="min-h-screen">
      <header
        className="flex items-center gap-3 border-b px-4 py-2"
        style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
      >
        <span className="text-[15px] font-semibold tracking-tight">righi solutions</span>
        <span className="text-[14px]" style={{ color: 'var(--testo-tenue)' }}>
          Impostazioni
        </span>
        <Link
          href="/pianificazione"
          className="ml-auto inline-flex h-7 items-center rounded-md border px-2.5 text-[12px] font-medium"
          style={{
            background: 'var(--sfondo-pannello)',
            borderColor: 'var(--bordo)',
            color: 'var(--testo)',
          }}
        >
          Torna alla pianificazione
        </Link>
      </header>

      <div
        className="flex items-center gap-2 border-b px-4 py-2"
        style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
      >
        {(
          [
            ['PERSONE', 'Persone e capacita'],
            ['CALENDARIO', 'Calendario e assenze'],
            ['TIPI', 'Tipi e stime'],
          ] as const
        ).map(([valore, etichetta]) => (
          <Pulsante key={valore} onClick={() => setSezione(valore)} attivo={sezione === valore}>
            {etichetta}
          </Pulsante>
        ))}

        {messaggio ? (
          <span
            role="status"
            className="ml-auto text-[12px]"
            style={{
              color: messaggio.errore ? 'var(--semaforo-rosso)' : 'var(--semaforo-verde)',
            }}
          >
            {messaggio.testo}
          </span>
        ) : null}
      </div>

      <main className="mx-auto max-w-[1100px] px-4 py-5">
        {sezione === 'PERSONE' ? (
          <SezionePersone persone={dati.persone} onSalva={chiama} />
        ) : sezione === 'CALENDARIO' ? (
          <SezioneCalendario
            voci={dati.indisponibilita}
            persone={dati.persone}
            oggi={dati.oggi}
            onChiama={chiama}
          />
        ) : (
          <SezioneTipi
            tipiAttivita={dati.tipiAttivita}
            tipiOfferta={dati.tipiOfferta}
            onSalva={chiama}
          />
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SezionePersone({
  persone,
  onSalva,
}: {
  persone: readonly PersonaImpostazioni[];
  onSalva: (url: string, metodo: string, corpo?: unknown) => Promise<boolean>;
}) {
  return (
    <section>
      <Intestazione
        titolo="Persone e capacita"
        nota="Le ore al giorno sono quelle dedicate davvero allo sviluppo offerte, non l'orario contrattuale. E' il denominatore della saturazione: un valore sbagliato rende la heatmap inutile."
      />

      <Tabella
        intestazioni={['Persona', 'Ruolo', 'Ore/giorno offerte', '% contratto', 'Limite WIP', 'Aperte', 'Attiva']}
      >
        {persone.map((p) => (
          <tr key={p.id} style={{ borderTop: '1px solid var(--bordo)' }}>
            <td className="px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: p.colore }}
                />
                <span className="text-[13px] font-medium">
                  {p.cognome} {p.nome}
                </span>
              </div>
              <span className="text-[11px]" style={{ color: 'var(--testo-debole)' }}>
                {p.email}
              </span>
            </td>
            <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
              {p.ruolo.toLowerCase()}
            </td>
            <td className="px-3 py-2">
              <CampoNumerico
                valore={p.capacitaOreGiorno}
                minimo={0}
                massimo={24}
                passo={0.5}
                onSalva={(v) => onSalva(`/api/persone/${p.id}`, 'PATCH', { capacitaOreGiorno: v })}
              />
            </td>
            <td className="px-3 py-2">
              <CampoNumerico
                valore={p.percentualeContratto}
                minimo={1}
                massimo={100}
                passo={5}
                onSalva={(v) =>
                  onSalva(`/api/persone/${p.id}`, 'PATCH', { percentualeContratto: Math.round(v) })
                }
              />
            </td>
            <td className="px-3 py-2">
              <CampoNumerico
                valore={p.limiteWip}
                minimo={1}
                massimo={50}
                passo={1}
                onSalva={(v) => onSalva(`/api/persone/${p.id}`, 'PATCH', { limiteWip: Math.round(v) })}
              />
            </td>
            <td
              className="px-3 py-2 text-[12px]"
              style={{
                color: p.attivitaAperte > p.limiteWip ? 'var(--semaforo-rosso)' : 'var(--testo-tenue)',
                fontWeight: p.attivitaAperte > p.limiteWip ? 600 : 400,
              }}
              title={
                p.attivitaAperte > p.limiteWip
                  ? 'Oltre il limite di lavoro in corso impostato'
                  : undefined
              }
            >
              {p.attivitaAperte}
            </td>
            <td className="px-3 py-2">
              <input
                type="checkbox"
                checked={p.attiva}
                onChange={(e) => void onSalva(`/api/persone/${p.id}`, 'PATCH', { attiva: e.target.checked })}
                aria-label={`Persona attiva: ${p.cognome} ${p.nome}`}
              />
            </td>
          </tr>
        ))}
      </Tabella>
    </section>
  );
}

function SezioneCalendario({
  voci,
  persone,
  oggi,
  onChiama,
}: {
  voci: readonly IndisponibilitaImpostazioni[];
  persone: readonly PersonaImpostazioni[];
  oggi: DataCivile;
  onChiama: (url: string, metodo: string, corpo?: unknown) => Promise<boolean>;
}) {
  const [personaId, setPersonaId] = useState<string>('');
  const [tipo, setTipo] = useState<keyof typeof ETICHETTE_TIPO>('FERIE');
  const [dataInizio, setDataInizio] = useState<DataCivile>(oggi);
  const [dataFine, setDataFine] = useState<DataCivile>(aggiungiGiorni(oggi, 4));
  const [oreGiorno, setOreGiorno] = useState<string>('');
  const [descrizione, setDescrizione] = useState('');

  const carico = tipo === 'CARICO_NON_OFFERTA';

  return (
    <section>
      <Intestazione
        titolo="Calendario e assenze"
        nota="Le festivita nazionali sono gia calcolate e non vanno inserite. Qui vanno ferie, chiusure aziendali, formazione e il carico non-offerta di chi segue anche commesse o assistenza."
      />

      <form
        className="mb-5 flex flex-wrap items-end gap-2 rounded-md border p-3"
        style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
        onSubmit={(e) => {
          e.preventDefault();
          void onChiama('/api/indisponibilita', 'POST', {
            personaId: personaId === '' ? null : personaId,
            dataInizio,
            dataFine,
            tipo,
            oreGiorno: carico ? Number(oreGiorno) : null,
            descrizione: descrizione.trim() === '' ? null : descrizione.trim(),
          });
        }}
      >
        <CampoEtichettato etichetta="Persona">
          <select
            value={personaId}
            onChange={(e) => setPersonaId(e.target.value)}
            className="h-8 rounded-md border px-2 text-[12px]"
            style={{ background: 'var(--sfondo)', borderColor: 'var(--bordo)', color: 'var(--testo)' }}
          >
            <option value="">Tutta l&apos;azienda</option>
            {persone.map((p) => (
              <option key={p.id} value={p.id}>
                {p.cognome} {p.nome}
              </option>
            ))}
          </select>
        </CampoEtichettato>

        <CampoEtichettato etichetta="Tipo">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as keyof typeof ETICHETTE_TIPO)}
            className="h-8 rounded-md border px-2 text-[12px]"
            style={{ background: 'var(--sfondo)', borderColor: 'var(--bordo)', color: 'var(--testo)' }}
          >
            {Object.entries(ETICHETTE_TIPO).map(([valore, etichetta]) => (
              <option key={valore} value={valore}>
                {etichetta}
              </option>
            ))}
          </select>
        </CampoEtichettato>

        <CampoEtichettato etichetta="Dal">
          <input
            type="date"
            value={dataInizio}
            onChange={(e) => setDataInizio(e.target.value as DataCivile)}
            className="h-8 rounded-md border px-2 text-[12px]"
            style={{ background: 'var(--sfondo)', borderColor: 'var(--bordo)', color: 'var(--testo)' }}
          />
        </CampoEtichettato>

        <CampoEtichettato etichetta="Al">
          <input
            type="date"
            value={dataFine}
            onChange={(e) => setDataFine(e.target.value as DataCivile)}
            className="h-8 rounded-md border px-2 text-[12px]"
            style={{ background: 'var(--sfondo)', borderColor: 'var(--bordo)', color: 'var(--testo)' }}
          />
        </CampoEtichettato>

        {carico ? (
          <CampoEtichettato etichetta="Ore/giorno sottratte">
            <input
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={oreGiorno}
              onChange={(e) => setOreGiorno(e.target.value)}
              required
              className="h-8 w-[110px] rounded-md border px-2 text-[12px]"
              style={{ background: 'var(--sfondo)', borderColor: 'var(--bordo)', color: 'var(--testo)' }}
            />
          </CampoEtichettato>
        ) : null}

        <CampoEtichettato etichetta="Nota">
          <input
            type="text"
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            maxLength={200}
            className="h-8 w-[180px] rounded-md border px-2 text-[12px]"
            style={{ background: 'var(--sfondo)', borderColor: 'var(--bordo)', color: 'var(--testo)' }}
          />
        </CampoEtichettato>

        <button
          type="submit"
          className="h-8 rounded-md border px-3 text-[12px] font-medium"
          style={{ background: 'var(--accento)', borderColor: 'var(--accento)', color: '#fff' }}
        >
          Aggiungi
        </button>
      </form>

      <Tabella intestazioni={['Persona', 'Tipo', 'Periodo', 'Ore/giorno', 'Nota', '']}>
        {voci.map((v) => (
          <tr key={v.id} style={{ borderTop: '1px solid var(--bordo)' }}>
            <td className="px-3 py-1.5 text-[12px]">{v.persona ?? 'Tutta l’azienda'}</td>
            <td className="px-3 py-1.5 text-[12px]">{ETICHETTE_TIPO[v.tipo] ?? v.tipo}</td>
            <td className="px-3 py-1.5 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
              {formatoBreve(v.dataInizio)} — {formatoBreve(v.dataFine)}
            </td>
            <td className="px-3 py-1.5 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
              {v.oreGiorno === null ? 'giornata intera' : formatoOre(v.oreGiorno)}
            </td>
            <td className="px-3 py-1.5 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
              {v.descrizione ?? ''}
            </td>
            <td className="px-3 py-1.5 text-right">
              <button
                type="button"
                onClick={() => void onChiama(`/api/indisponibilita/${v.id}`, 'DELETE')}
                className="text-[12px]"
                style={{ color: 'var(--semaforo-rosso)' }}
              >
                Elimina
              </button>
            </td>
          </tr>
        ))}
      </Tabella>
    </section>
  );
}

function SezioneTipi({
  tipiAttivita,
  tipiOfferta,
  onSalva,
}: {
  tipiAttivita: readonly TipoAttivitaImpostazioni[];
  tipiOfferta: DatiImpostazioni['tipiOfferta'];
  onSalva: (url: string, metodo: string, corpo?: unknown) => Promise<boolean>;
}) {
  return (
    <section>
      <Intestazione
        titolo="Tipi di attivita e stime predefinite"
        nota="La stima predefinita riempie il campo da sola quando nasce una richiesta. E' cio che evita che le stime non vengano mai inserite e che la heatmap resti vuota."
      />

      <Tabella intestazioni={['Tipo attivita', 'Stima predefinita', 'Colore', 'Usi', 'Attivo']}>
        {tipiAttivita.map((t) => (
          <tr key={t.id} style={{ borderTop: '1px solid var(--bordo)' }}>
            <td className="px-3 py-2 text-[13px] font-medium">{t.nome}</td>
            <td className="px-3 py-2">
              <CampoNumerico
                valore={t.stimaDefaultOre}
                minimo={0.5}
                massimo={500}
                passo={0.5}
                onSalva={(v) => onSalva(`/api/tipi-attivita/${t.id}`, 'PATCH', { stimaDefaultOre: v })}
              />
            </td>
            <td className="px-3 py-2">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-8 rounded-[2px]"
                style={{ background: t.colore }}
              />
            </td>
            <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
              {t.usi}
            </td>
            <td className="px-3 py-2">
              <input
                type="checkbox"
                checked={t.attivo}
                onChange={(e) =>
                  void onSalva(`/api/tipi-attivita/${t.id}`, 'PATCH', { attivo: e.target.checked })
                }
                aria-label={`Tipo attivo: ${t.nome}`}
              />
            </td>
          </tr>
        ))}
      </Tabella>

      <div className="mt-6">
        <Intestazione
          titolo="Template dei tipi di offerta"
          nota="Sono le attivita che nascono insieme a una nuova richiesta. Modificarli richiede una decisione di processo, quindi qui sono in sola lettura: si cambiano a schema, non al volo."
        />
        <Tabella intestazioni={['Tipo di offerta', 'Attivita generate', 'Totale', 'Usi']}>
          {tipiOfferta.map((t) => (
            <tr key={t.id} style={{ borderTop: '1px solid var(--bordo)' }}>
              <td className="px-3 py-2 text-[13px] font-medium">{t.nome}</td>
              <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
                {t.righe.map((r) => `${r.tipoAttivita} (${formatoOre(r.stimaOre)})`).join(' → ')}
              </td>
              <td className="px-3 py-2 text-[12px]">{formatoOre(t.oreTotali)}</td>
              <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
                {t.usi}
              </td>
            </tr>
          ))}
        </Tabella>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Intestazione({ titolo, nota }: { titolo: string; nota: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[14px] font-semibold">{titolo}</h2>
      <p className="mt-0.5 max-w-[70ch] text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
        {nota}
      </p>
    </div>
  );
}

function Tabella({
  intestazioni,
  children,
}: {
  intestazioni: readonly string[];
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-md border"
      style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ background: 'var(--sfondo-tenue)' }}>
            {intestazioni.map((i) => (
              <th
                key={i}
                className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--testo-debole)' }}
              >
                {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function CampoEtichettato({
  etichetta,
  children,
}: {
  etichetta: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--testo-debole)' }}
      >
        {etichetta}
      </span>
      {children}
    </label>
  );
}

/** Campo numerico che salva alla perdita di fuoco, non a ogni battitura. */
function CampoNumerico({
  valore,
  minimo,
  massimo,
  passo,
  onSalva,
}: {
  valore: number;
  minimo: number;
  massimo: number;
  passo: number;
  onSalva: (valore: number) => Promise<boolean>;
}) {
  const [bozza, setBozza] = useState(String(valore));

  return (
    <input
      type="number"
      value={bozza}
      min={minimo}
      max={massimo}
      step={passo}
      onChange={(e) => setBozza(e.target.value)}
      onBlur={() => {
        const numero = Number(bozza);
        if (!Number.isFinite(numero) || numero < minimo || numero > massimo) {
          setBozza(String(valore));
          return;
        }
        if (numero === valore) return;
        void onSalva(numero).then((ok) => {
          if (!ok) setBozza(String(valore));
        });
      }}
      className="h-7 w-[90px] rounded-md border px-2 text-[12px]"
      style={{ background: 'var(--sfondo)', borderColor: 'var(--bordo)', color: 'var(--testo)' }}
    />
  );
}
