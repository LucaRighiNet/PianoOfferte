'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DatiDashboard } from '@/lib/query/dashboard';
import type { CaricoAggregato } from '@/lib/capacita/saturazione';
import { formatoBreve, formatoOre, formatoPercentuale } from '@/lib/data/formato';
import { Pulsante } from './ui';

/**
 * Dashboard direzionale (S1).
 *
 * Par. 9 del piano: quattro domande, quattro risposte. Il riquadro sugli esiti
 * commerciali resta fuori per la decisione D7.
 *
 * Scelte di forma, secondo il metodo di visualizzazione adottato:
 * - il carico e una griglia persona per settimana, non un istogramma: il lavoro
 *   del lettore e confrontare grandezze su una griglia, e la heatmap e la forma
 *   giusta per quello;
 * - "a rischio" e una tabella, non un grafico: oltre sette classi con
 *   significato una tabella batte qualunque colore;
 * - i tempi di preparazione sono una cifra guida, non un grafico: il numero e
 *   il grafico;
 * - il lavoro in corso e una barra per persona con il limite marcato: una serie
 *   sola, quindi un colore solo e nessuna legenda di serie.
 *
 * I colori di stato non portano mai il significato da soli: ogni cella mostra
 * la percentuale, ogni barra il conteggio, ed esiste una vista tabellare.
 */

const COLORE_FASCIA: Readonly<Record<CaricoAggregato['fascia'], string>> = {
  NON_LAVORATIVO: 'var(--carico-non-lavorativo)',
  SCARICO: 'var(--carico-scarico)',
  SANO: 'var(--carico-sano)',
  PIENO: 'var(--carico-pieno)',
  SOVRACCARICO: 'var(--carico-sovraccarico)',
};

const ETICHETTA_FASCIA: Readonly<Record<CaricoAggregato['fascia'], string>> = {
  NON_LAVORATIVO: 'Non lavorativo',
  SCARICO: 'Spazio disponibile',
  SANO: 'Carico sano',
  PIENO: 'Pieno',
  SOVRACCARICO: 'Sovraccarico',
};

const ETICHETTA_CAUSALE: Readonly<Record<string, string>> = {
  ATTESA_DATO_CLIENTE: 'attesa dato cliente',
  ATTESA_QUOTAZIONE_FORNITORE: 'attesa quotazione fornitore',
  ATTESA_SPECIFICA_TECNICA: 'attesa specifica tecnica',
  PRIORITA_SUPERIORE: 'priorita superiore',
  ALTRO: 'altro',
};

/** Le fasce con testo scuro sopra: ambra e grigio non reggono il bianco. */
const TESTO_SCURO = new Set<CaricoAggregato['fascia']>([
  'PIENO',
  'SCARICO',
  'NON_LAVORATIVO',
]);

export function Dashboard({ dati }: { dati: DatiDashboard }) {
  const [vistaTabella, setVistaTabella] = useState(false);

  return (
    <div className="min-h-screen">
      <header
        className="flex items-center gap-3 border-b px-4 py-2"
        style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
      >
        <span className="text-[15px] font-semibold tracking-tight">righi solutions</span>
        <span className="text-[14px]" style={{ color: 'var(--testo-tenue)' }}>
          Dashboard
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/pianificazione"
            className="inline-flex h-7 items-center rounded-md border px-2.5 text-[12px] font-medium"
            style={{
              background: 'var(--sfondo-pannello)',
              borderColor: 'var(--bordo)',
              color: 'var(--testo)',
            }}
          >
            Pianificazione
          </Link>
          <Link
            href="/impostazioni"
            className="inline-flex h-7 items-center rounded-md border px-2.5 text-[12px] font-medium"
            style={{
              background: 'var(--sfondo-pannello)',
              borderColor: 'var(--bordo)',
              color: 'var(--testo)',
            }}
          >
            Impostazioni
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 py-5">
        <RigaIndicatori dati={dati} />

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Riquadro
            titolo="Carico delle prossime quattro settimane"
            domanda="Abbiamo capacita per accettare altro lavoro?"
            azione={
              <Pulsante onClick={() => setVistaTabella((v) => !v)} attivo={vistaTabella}>
                {vistaTabella ? 'Griglia' : 'Tabella'}
              </Pulsante>
            }
          >
            {vistaTabella ? (
              <TabellaCarico dati={dati} />
            ) : (
              <GrigliaCarico dati={dati} />
            )}
            <LegendaCarico />
          </Riquadro>

          <Riquadro
            titolo="Lavoro in corso per persona"
            domanda="Chi ha troppe cose aperte contemporaneamente?"
          >
            <BarreWip dati={dati} />
          </Riquadro>

          <Riquadro
            titolo="Offerte a rischio"
            domanda="Cosa rischia di saltare?"
            larghezzaPiena
          >
            <TabellaRischio dati={dati} />
          </Riquadro>

          <Riquadro
            titolo="Tempi di preparazione per tipo"
            domanda="Quali offerte ci costano piu tempo?"
            larghezzaPiena
          >
            <TabellaLeadTime dati={dati} />
          </Riquadro>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function RigaIndicatori({ dati }: { dati: DatiDashboard }) {
  const sovraccarichi = dati.carico.filter((r) =>
    r.settimane.some((s) => s.fascia === 'SOVRACCARICO'),
  ).length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Cifra
        etichetta="Tempo di preparazione, mediana"
        valore={dati.leadTime.mediana === null ? '—' : String(Math.round(dati.leadTime.mediana))}
        unita={dati.leadTime.mediana === null ? '' : 'giorni'}
        nota={`su ${dati.leadTime.campione} offerte consegnate negli ultimi ${dati.giorniStorico} giorni`}
        guida
      />
      <Cifra
        etichetta="Consegnate entro la scadenza"
        valore={formatoPercentuale(dati.puntualita.percentuale)}
        unita=""
        nota={`${dati.puntualita.consegnateInTempo} su ${dati.puntualita.consegnateTotali} con scadenza nota`}
        colore={
          dati.puntualita.percentuale === null
            ? undefined
            : dati.puntualita.percentuale >= 90
              ? 'var(--carico-sano)'
              : dati.puntualita.percentuale >= 75
                ? 'var(--carico-pieno)'
                : 'var(--carico-sovraccarico)'
        }
      />
      <Cifra
        etichetta="Offerte a rischio"
        valore={String(dati.rischio.length)}
        unita=""
        nota="margine di cinque giorni o meno sulla scadenza"
        colore={dati.rischio.length > 0 ? 'var(--carico-sovraccarico)' : undefined}
      />
      <Cifra
        etichetta="Persone in sovraccarico"
        valore={String(sovraccarichi)}
        unita={`su ${dati.carico.length}`}
        nota="almeno una settimana oltre il 100% nel prossimo mese"
        colore={sovraccarichi > 0 ? 'var(--carico-sovraccarico)' : undefined}
      />
    </div>
  );
}

function Cifra({
  etichetta,
  valore,
  unita,
  nota,
  colore,
  guida = false,
}: {
  etichetta: string;
  valore: string;
  unita: string;
  nota: string;
  colore?: string;
  guida?: boolean;
}) {
  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--testo-debole)' }}
      >
        {etichetta}
      </p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span
          style={{
            fontSize: guida ? 48 : 30,
            lineHeight: 1,
            fontWeight: 600,
            color: colore ?? 'var(--testo)',
          }}
        >
          {valore}
        </span>
        {unita === '' ? null : (
          <span className="text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
            {unita}
          </span>
        )}
      </p>
      <p className="mt-1.5 text-[11px]" style={{ color: 'var(--testo-debole)' }}>
        {nota}
      </p>
    </div>
  );
}

function Riquadro({
  titolo,
  domanda,
  azione,
  larghezzaPiena = false,
  children,
}: {
  titolo: string;
  domanda: string;
  azione?: React.ReactNode;
  larghezzaPiena?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border p-4 ${larghezzaPiena ? 'lg:col-span-2' : ''}`}
      style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
    >
      <div className="mb-3 flex items-start gap-3">
        <div>
          <h2 className="text-[13px] font-semibold">{titolo}</h2>
          <p className="text-[11px]" style={{ color: 'var(--testo-debole)' }}>
            {domanda}
          </p>
        </div>
        {azione ? <div className="ml-auto">{azione}</div> : null}
      </div>
      {children}
    </section>
  );
}

function GrigliaCarico({ dati }: { dati: DatiDashboard }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ borderSpacing: 0 }}>
        <thead>
          <tr>
            <th className="w-[38%] px-1 pb-1 text-left text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--testo-debole)' }}>
              Risorsa
            </th>
            {dati.settimane.map((s) => (
              <th
                key={s.chiave}
                className="px-1 pb-1 text-center text-[10px] font-semibold"
                style={{ color: 'var(--testo-debole)' }}
                title={`${formatoBreve(s.inizio)} — ${formatoBreve(s.fine)}`}
              >
                {s.etichetta}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dati.carico.map((riga) => (
            <tr key={riga.personaId}>
              <td className="py-[3px] pr-2 text-[12px]">{riga.persona}</td>
              {riga.settimane.map((s, i) => (
                <td key={dati.settimane[i]?.chiave ?? i} className="px-[1px] py-[3px]">
                  <div
                    title={`${riga.persona} · ${dati.settimane[i]?.etichetta ?? ''}
${ETICHETTA_FASCIA[s.fascia]}
${formatoOre(s.oreAllocate)} allocate su ${formatoOre(s.oreDisponibili)}`}
                    className="flex h-6 items-center justify-center rounded-[4px] text-[11px] font-medium tabular-nums"
                    style={{
                      background: COLORE_FASCIA[s.fascia],
                      color: TESTO_SCURO.has(s.fascia) ? '#1a2230' : '#ffffff',
                    }}
                  >
                    {s.percentuale === null ? '—' : `${Math.round(s.percentuale)}%`}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabellaCarico({ dati }: { dati: DatiDashboard }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr style={{ background: 'var(--sfondo-tenue)' }}>
            <th className="px-2 py-1 text-left text-[10px] font-semibold uppercase" style={{ color: 'var(--testo-debole)' }}>
              Risorsa
            </th>
            {dati.settimane.map((s) => (
              <th key={s.chiave} className="px-2 py-1 text-right text-[10px] font-semibold" style={{ color: 'var(--testo-debole)' }}>
                {s.etichetta} allocate / disponibili
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dati.carico.map((riga) => (
            <tr key={riga.personaId} style={{ borderTop: '1px solid var(--bordo)' }}>
              <td className="px-2 py-1">{riga.persona}</td>
              {riga.settimane.map((s, i) => (
                <td key={dati.settimane[i]?.chiave ?? i} className="px-2 py-1 text-right tabular-nums">
                  {formatoOre(s.oreAllocate)} / {formatoOre(s.oreDisponibili)}{' '}
                  <span style={{ color: 'var(--testo-debole)' }}>
                    ({formatoPercentuale(s.percentuale)})
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LegendaCarico() {
  const voci: CaricoAggregato['fascia'][] = [
    'SCARICO',
    'SANO',
    'PIENO',
    'SOVRACCARICO',
    'NON_LAVORATIVO',
  ];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      {voci.map((f) => (
        <span key={f} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--testo-tenue)' }}>
          <span
            aria-hidden="true"
            className="h-2.5 w-3.5 rounded-[2px]"
            style={{ background: COLORE_FASCIA[f] }}
          />
          {ETICHETTA_FASCIA[f]}
        </span>
      ))}
    </div>
  );
}

function BarreWip({ dati }: { dati: DatiDashboard }) {
  const massimo = Math.max(1, ...dati.wip.map((v) => Math.max(v.aperte, v.limite)));

  return (
    <div className="space-y-1.5">
      {dati.wip.map((v) => {
        const larghezza = (v.aperte / massimo) * 100;
        const posizioneLimite = (v.limite / massimo) * 100;
        return (
          <div key={v.personaId} className="flex items-center gap-2">
            <span className="w-[38%] shrink-0 truncate text-[12px]" title={v.persona}>
              {v.persona}
            </span>
            <div
              className="relative h-4 flex-1 rounded-[3px]"
              style={{ background: 'var(--sfondo-tenue)' }}
              title={`${v.aperte} attivita aperte, limite ${v.limite}${
                v.anzianitaMassima === null ? '' : `, la piu vecchia da ${v.anzianitaMassima} giorni`
              }`}
            >
              <div
                className="absolute top-0 bottom-0 left-0 rounded-[3px]"
                style={{
                  width: `${larghezza}%`,
                  background: v.oltreIlLimite ? 'var(--carico-sovraccarico)' : 'var(--accento)',
                }}
              />
              {/* Il limite e una marca di riferimento, non una serie. */}
              <div
                aria-hidden="true"
                className="absolute top-[-2px] bottom-[-2px] w-px"
                style={{ left: `${posizioneLimite}%`, background: 'var(--testo-tenue)' }}
                title={`Limite ${v.limite}`}
              />
            </div>
            <span
              className="w-[70px] shrink-0 text-right text-[11px] tabular-nums"
              style={{
                color: v.oltreIlLimite ? 'var(--carico-sovraccarico)' : 'var(--testo-tenue)',
                fontWeight: v.oltreIlLimite ? 600 : 400,
              }}
            >
              {v.aperte} / {v.limite}
            </span>
            <span
              className="w-[56px] shrink-0 text-right text-[11px] tabular-nums"
              style={{ color: 'var(--testo-debole)' }}
              title="Giorni dalla presa in carico dell'attivita aperta piu vecchia"
            >
              {v.anzianitaMassima === null ? '—' : `${v.anzianitaMassima} gg`}
            </span>
          </div>
        );
      })}
      <p className="pt-1 text-[10px]" style={{ color: 'var(--testo-debole)' }}>
        La tacca verticale e il limite impostato per la persona. L&apos;ultima colonna e
        l&apos;eta dell&apos;attivita aperta da piu tempo.
      </p>
    </div>
  );
}

function TabellaRischio({ dati }: { dati: DatiDashboard }) {
  if (dati.rischio.length === 0) {
    return (
      <p className="py-3 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
        Nessuna offerta con margine inferiore a cinque giorni. Nulla da decidere adesso.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr style={{ background: 'var(--sfondo-tenue)' }}>
            {['Margine', 'Offerta', 'Cliente', 'Consegna prevista', 'Scadenza', 'Stato'].map((i) => (
              <th
                key={i}
                className="px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--testo-debole)' }}
              >
                {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dati.rischio.map((v) => (
            <tr key={v.offerta.id} style={{ borderTop: '1px solid var(--bordo)' }}>
              <td className="px-2 py-1 tabular-nums">
                <span
                  style={{
                    color: v.margine < 0 ? 'var(--carico-sovraccarico)' : 'var(--carico-pieno)',
                    fontWeight: 600,
                  }}
                >
                  {v.margine < 0 ? `${v.margine} gg` : `+${v.margine} gg`}
                </span>
              </td>
              <td className="px-2 py-1">
                {v.offerta.descrizione}
                <span className="ml-1" style={{ color: 'var(--testo-debole)' }}>
                  {v.offerta.codice}
                </span>
              </td>
              <td className="px-2 py-1" style={{ color: 'var(--testo-tenue)' }}>
                {v.offerta.cliente}
              </td>
              <td className="px-2 py-1 tabular-nums" style={{ color: 'var(--testo-tenue)' }}>
                {v.offerta.dataFinePianificata ? formatoBreve(v.offerta.dataFinePianificata) : '—'}
              </td>
              <td className="px-2 py-1 tabular-nums" style={{ color: 'var(--testo-tenue)' }}>
                {v.offerta.dataScadenzaCliente ? formatoBreve(v.offerta.dataScadenzaCliente) : '—'}
              </td>
              <td className="px-2 py-1" style={{ color: 'var(--testo-tenue)' }}>
                {v.bloccata
                  ? `bloccata: ${ETICHETTA_CAUSALE[v.offerta.causaleBlocco ?? 'ALTRO'] ?? 'altro'}`
                  : (v.offerta.persona ?? 'non assegnata')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabellaLeadTime({ dati }: { dati: DatiDashboard }) {
  if (dati.leadTimePerTipo.length === 0) {
    return (
      <p className="py-3 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
        Nessuna offerta consegnata nel periodo: non c&apos;e ancora una misura affidabile.
      </p>
    );
  }

  const massimo = Math.max(...dati.leadTimePerTipo.map((r) => r.mediana));

  return (
    <div className="space-y-1.5">
      {dati.leadTimePerTipo.map((r) => (
        <div key={r.tipo} className="flex items-center gap-2">
          <span className="w-[28%] shrink-0 truncate text-[12px]" title={r.tipo}>
            {r.tipo}
          </span>
          <div className="h-4 flex-1 rounded-[3px]" style={{ background: 'var(--sfondo-tenue)' }}>
            <div
              className="h-full rounded-[3px]"
              style={{ width: `${(r.mediana / massimo) * 100}%`, background: 'var(--accento)' }}
              title={`Mediana ${Math.round(r.mediana)} giorni su ${r.campione} offerte`}
            />
          </div>
          <span className="w-[78px] shrink-0 text-right text-[11px] tabular-nums">
            {Math.round(r.mediana)} giorni
          </span>
          <span
            className="w-[62px] shrink-0 text-right text-[11px] tabular-nums"
            style={{ color: 'var(--testo-debole)' }}
          >
            n={r.campione}
          </span>
        </div>
      ))}
      <p className="pt-1 text-[10px]" style={{ color: 'var(--testo-debole)' }}>
        Mediana dei giorni di calendario fra la richiesta e la consegna, ultimi{' '}
        {dati.giorniStorico} giorni. La mediana, non la media: un paio di offerte
        lunghissime non devono spostare il valore.
      </p>
    </div>
  );
}
