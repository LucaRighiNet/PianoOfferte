'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  aggiungiGiorni,
  confronta,
  eWeekend,
  giorniTra,
  giornoSettimanaIso,
  inizioSettimana,
  type DataCivile,
} from '@/lib/data/dataCivile';
import { formatoBreve, formatoOre, formatoPercentuale } from '@/lib/data/formato';
import {
  CalendarioLavorativo,
  type PersonaCapacita,
  type VoceIndisponibilita,
} from '@/lib/calendario/calendarioLavorativo';
import {
  aggregaCarico,
  allocazionePerPersona,
  caricoGiornaliero,
  type CaricoGiorno,
} from '@/lib/capacita/saturazione';
import { impilaInCorsie } from '@/lib/timeline/corsie';
import { collocaBarra, colonnaDelGiorno } from '@/lib/timeline/geometria';
import {
  ETICHETTE_SEMAFORO,
  ETICHETTE_STATO,
  statoVisualizzato,
  valutaMargine,
  type Semaforo,
  type StatoAttivitaMemorizzato,
} from '@/lib/offerta/rischio';
import { costruisciGruppi } from '@/lib/vista/raggruppamento';
import {
  ETICHETTE_RAGGRUPPAMENTO,
  LIVELLI_ZOOM,
  ZOOM,
  type LivelloZoom,
  type Raggruppamento,
} from '@/lib/vista/zoom';
import type { AttivitaVista, PianoDati } from '@/lib/query/piano';
import { IntestazioneTempo, type GiornoVista } from './IntestazioneTempo';
import { RigaCapacita } from './RigaCapacita';
import { BarraAttivita, type DatiBarra } from './BarraAttivita';
import { CodaDaAssegnare, type VoceCoda } from './CodaDaAssegnare';
import { Legenda } from './Legenda';
import { ModuloNuovaRdo } from './ModuloNuovaRdo';
import { useTrascinamento, type EsitoRilascio, type OrigineGesto } from './useTrascinamento';
import { useAnnulla, type Ripristino } from './useAnnulla';
import { Avatar, Chip, GruppoSegmentato, Pulsante, Selettore } from './ui';
import {
  ETICHETTE_RUOLO,
  puoCreareOfferta,
  puoModificareImpostazioni,
  puoPianificare,
  puoRegistrareConsuntivo,
} from '@/lib/auth/permessi';

/** Termina la sessione di sviluppo e riporta alla scelta dell'utenza. */
async function esci(): Promise<void> {
  await fetch('/api/accesso', { method: 'DELETE' });
  window.location.href = '/accesso';
}

const LARGHEZZA_GRIGLIA = 244;
const ALTEZZA_CAPACITA = 22;
const ALTEZZA_CORSIA = 26;
const ALTEZZA_BARRA = 18;
/** Oltre questo numero di gruppi la vista non e leggibile: par. 1.2 del piano. */
const MAX_GRUPPI_LEGGIBILI = 40;

type FiltroStato = 'TUTTI' | 'ATTIVE' | 'COMPLETATE';
const ETICHETTE_FILTRO_STATO: Readonly<Record<FiltroStato, string>> = {
  TUTTI: 'Tutte',
  ATTIVE: 'In corso',
  COMPLETATE: 'Completate',
};

const COLORE_SEMAFORO: Readonly<Record<Semaforo, string>> = {
  SENZA_SCADENZA: 'var(--testo-debole)',
  VERDE: 'var(--semaforo-verde)',
  AMBRA: 'var(--semaforo-ambra)',
  ROSSO: 'var(--semaforo-rosso)',
  SFORATA: 'var(--semaforo-sforata)',
};

type StatoSalvataggio =
  | { readonly tipo: 'RIPOSO' }
  | { readonly tipo: 'IN_CORSO' }
  | { readonly tipo: 'SALVATO' }
  | { readonly tipo: 'ERRORE'; readonly messaggio: string };

export function Pianificatore({
  dati,
  ancoraIniziale,
  zoomIniziale,
}: {
  dati: PianoDati;
  ancoraIniziale: DataCivile;
  zoomIniziale: LivelloZoom;
}) {
  const router = useRouter();
  const [ancora, setAncora] = useState<DataCivile>(ancoraIniziale);
  const [zoom, setZoom] = useState<LivelloZoom>(zoomIniziale);
  const [modo, setModo] = useState<Raggruppamento>('RISORSA');
  const [filtroStato, setFiltroStato] = useState<FiltroStato>('ATTIVE');
  const [filtroPersona, setFiltroPersona] = useState<string>('');
  const [filtroCliente, setFiltroCliente] = useState<string>('');
  const [filtroKam, setFiltroKam] = useState<string>('');
  const [selezionata, setSelezionata] = useState<string | null>(null);
  const [tema, setTema] = useState<'chiaro' | 'scuro'>('chiaro');
  const [salvataggio, setSalvataggio] = useState<StatoSalvataggio>({ tipo: 'RIPOSO' });
  const [statiLocali, setStatiLocali] = useState<
    ReadonlyMap<string, { stato: StatoAttivitaMemorizzato; versione: number }>
  >(new Map());
  const annulla = useAnnulla();
  const [mostraNuovaRdo, setMostraNuovaRdo] = useState(false);
  const [avviso, setAvviso] = useState<string | null>(null);

  const contenitore = useRef<HTMLDivElement>(null);

  const puoSpostare = puoPianificare(dati.utente.ruolo);
  const puoCreare = puoCreareOfferta(dati.utente.ruolo);

  useEffect(() => {
    try {
      const salvato = localStorage.getItem('tema');
      if (salvato === 'scuro' || salvato === 'chiaro') {
        setTema(salvato);
        return;
      }
    } catch {
      // Storage non disponibile: si resta sulla preferenza di sistema.
    }
    const scuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTema(scuro ? 'scuro' : 'chiaro');
  }, []);

  const cambiaTema = useCallback(() => {
    setTema((precedente) => {
      const nuovo = precedente === 'scuro' ? 'chiaro' : 'scuro';
      document.documentElement.setAttribute('data-tema', nuovo);
      try {
        localStorage.setItem('tema', nuovo);
      } catch {
        // La preferenza vale solo per questa sessione.
      }
      return nuovo;
    });
  }, []);

  // --- finestra visibile -------------------------------------------------
  const definizione = ZOOM[zoom];
  const finestraDa = ancora;
  const finestraA = aggiungiGiorni(ancora, definizione.giorniVisibili - 1);

  // Il server carica un margine attorno alla finestra: se la navigazione esce
  // dal caricato si ricarica, altrimenti lo spostamento e immediato.
  const fuoriDalCaricato =
    confronta(finestraDa, dati.finestraDa) < 0 || confronta(finestraA, dati.finestraA) > 0;

  useEffect(() => {
    if (!fuoriDalCaricato) return;
    router.replace(`/pianificazione?da=${ancora}&zoom=${zoom}`);
  }, [fuoriDalCaricato, ancora, zoom, router]);

  // --- calendario e allocazione ------------------------------------------
  const calendario = useMemo(() => {
    const capacita: PersonaCapacita[] = dati.persone.map((p) => ({
      id: p.id,
      capacitaOreGiorno: p.capacitaOreGiorno,
      percentualeContratto: p.percentualeContratto,
    }));
    const voci: VoceIndisponibilita[] = dati.indisponibilita.map((i) => ({
      personaId: i.personaId,
      dataInizio: i.dataInizio,
      dataFine: i.dataFine,
      oreGiorno: i.oreGiorno,
    }));
    return new CalendarioLavorativo(capacita, voci);
  }, [dati.persone, dati.indisponibilita]);

  const offerteMappa = useMemo(
    () => new Map(dati.offerte.map((o) => [o.id, o])),
    [dati.offerte],
  );

  const coloriTipo = useMemo(
    () => new Map(dati.tipiAttivita.map((t) => [t.id, t.colore])),
    [dati.tipiAttivita],
  );

  /** Nome del tipo per identificativo: non viaggia su ogni attivita. */
  const nomiTipo = useMemo(
    () => new Map(dati.tipiAttivita.map((t) => [t.id, t.nome])),
    [dati.tipiAttivita],
  );
  const nomeTipoDi = useCallback(
    (tipoAttivitaId: string): string => nomiTipo.get(tipoAttivitaId) ?? 'Attivita',
    [nomiTipo],
  );

  /** Applica al volo gli stati cambiati dall'utente ma non ancora ricaricati. */
  const conStatoLocale = useCallback(
    (a: AttivitaVista): AttivitaVista => {
      const locale = statiLocali.get(a.id);
      return locale ? { ...a, stato: locale.stato, versione: locale.versione } : a;
    },
    [statiLocali],
  );

  const attivitaPianificate = useMemo(
    () =>
      dati.attivita
        .filter((a) => a.dataInizio !== null && a.dataFine !== null)
        .map(conStatoLocale),
    [dati.attivita, conStatoLocale],
  );

  // Il filtro non chiama il server: par. 7.3, sotto i 150 ms.
  const attivitaFiltrate = useMemo(() => {
    return attivitaPianificate.filter((a) => {
      if (filtroPersona !== '' && a.personaId !== filtroPersona) return false;
      const o = offerteMappa.get(a.offertaId);
      if (!o) return false;
      if (filtroCliente !== '' && o.clienteId !== filtroCliente) return false;
      if (filtroKam !== '' && o.kamId !== filtroKam) return false;
      if (filtroStato === 'ATTIVE' && a.stato === 'COMPLETATA') return false;
      if (filtroStato === 'COMPLETATE' && a.stato !== 'COMPLETATA') return false;
      return true;
    });
  }, [attivitaPianificate, filtroPersona, filtroCliente, filtroKam, filtroStato, offerteMappa]);

  // La saturazione considera tutto il lavoro pianificato, non solo il filtrato:
  // nascondere meta del carico renderebbe la heatmap una bugia.
  const allocazione = useMemo(
    () =>
      allocazionePerPersona(
        calendario,
        attivitaPianificate.filter((a) => a.stato !== 'COMPLETATA'),
      ),
    [calendario, attivitaPianificate],
  );

  const giorni: readonly GiornoVista[] = useMemo(
    () =>
      giorniTra(finestraDa, finestraA).map((data) => ({
        data,
        weekend: eWeekend(data),
        festivita: calendario.nomeFestivita(data),
        oggi: data === dati.oggi,
        inizioSettimana: giornoSettimanaIso(data) === 1,
      })),
    [finestraDa, finestraA, calendario, dati.oggi],
  );

  /**
   * Colonne che la griglia di sfondo non sa esprimere: festivita e giorno
   * corrente. Sono poche e si calcolano una volta per la finestra, non una
   * volta per riga.
   */
  const colonneIrregolari = useMemo(() => {
    const festivita: { colonna: number; nome: string }[] = [];
    let oggiColonna: number | null = null;
    giorni.forEach((g, colonna) => {
      if (g.festivita !== null) festivita.push({ colonna, nome: g.festivita });
      if (g.oggi) oggiColonna = colonna;
    });
    return { festivita, oggiColonna };
  }, [giorni]);

  /** Distanza del primo lunedi dal bordo sinistro, per allineare lo sfondo. */
  const sfasamentoSettimana = useMemo(
    () => (giornoSettimanaIso(finestraDa) - 1) * definizione.larghezzaGiorno,
    [finestraDa, definizione.larghezzaGiorno],
  );

  const personeVisibili = useMemo(
    () => (filtroPersona === '' ? dati.persone : dati.persone.filter((p) => p.id === filtroPersona)),
    [dati.persone, filtroPersona],
  );

  const gruppi = useMemo(
    () =>
      costruisciGruppi({
        attivita: attivitaFiltrate,
        offerte: offerteMappa,
        persone: personeVisibili,
        modo,
        tutteLeAttivita: attivitaPianificate,
      }),
    [attivitaFiltrate, offerteMappa, personeVisibili, modo, attivitaPianificate],
  );

  const gruppiTroncati = modo !== 'RISORSA' && gruppi.length > MAX_GRUPPI_LEGGIBILI;
  const gruppiVisualizzati = gruppiTroncati ? gruppi.slice(0, MAX_GRUPPI_LEGGIBILI) : gruppi;

  /*
   * Una riga per OFFERTA, non per attivita. Assegnare la prima attivita assegna
   * anche i successori liberi alla stessa persona, quindi elencarli tutti
   * gonfierebbe la coda senza aggiungere decisioni da prendere.
   */
  const coda: readonly VoceCoda[] = useMemo(() => {
    const perOfferta = new Map<string, AttivitaVista[]>();
    for (const a of dati.attivita) {
      if (a.personaId !== null && a.dataInizio !== null) continue;
      const elenco = perOfferta.get(a.offertaId);
      if (elenco) elenco.push(a);
      else perOfferta.set(a.offertaId, [a]);
    }

    const voci: VoceCoda[] = [];
    for (const [offertaId, attivita] of perOfferta) {
      const o = offerteMappa.get(offertaId);
      if (!o) continue;
      if (filtroCliente !== '' && o.clienteId !== filtroCliente) continue;
      if (filtroKam !== '' && o.kamId !== filtroKam) continue;

      const ordinate = [...attivita].sort((x, y) => x.ordine - y.ordine);
      const prima = ordinate[0];
      if (!prima) continue;

      voci.push({
        attivitaId: prima.id,
        etichetta: nomeTipoDi(prima.tipoAttivitaId),
        stimaOre: ordinate.reduce((somma, a) => somma + a.stimaOre, 0),
        versione: prima.versione,
        attivitaInCatena: ordinate.length,
        offerta: o,
      });
    }
    return voci;
  }, [dati.attivita, offerteMappa, filtroCliente, filtroKam, nomeTipoDi]);

  const attivitaSelezionata = useMemo(() => {
    if (selezionata === null) return null;
    const a = dati.attivita.find((x) => x.id === selezionata);
    return a ? conStatoLocale(a) : null;
  }, [selezionata, dati.attivita, conStatoLocale]);

  // --- cambio stato ------------------------------------------------------
  const cambiaStato = useCallback(
    async (attivita: AttivitaVista, nuovo: StatoAttivitaMemorizzato) => {
      const causale = nuovo === 'BLOCCATA' ? 'ATTESA_DATO_CLIENTE' : null;
      const versionePrecedente = attivita.versione;
      const statoPrecedente = attivita.stato;

      // Aggiornamento ottimistico: il riscontro e immediato (par. 7.3).
      setStatiLocali((m) =>
        new Map(m).set(attivita.id, { stato: nuovo, versione: versionePrecedente }),
      );
      setSalvataggio({ tipo: 'IN_CORSO' });

      try {
        const risposta = await fetch(`/api/attivita/${attivita.id}/stato`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ stato: nuovo, causaleBlocco: causale, versione: versionePrecedente }),
        });

        if (!risposta.ok) {
          // Rollback esplicito: par. 14.8, le modifiche non confermate non
          // spariscono in silenzio.
          setStatiLocali((m) =>
            new Map(m).set(attivita.id, { stato: statoPrecedente, versione: versionePrecedente }),
          );
          const messaggio =
            risposta.status === 409
              ? 'Modificata da un altro utente: ricarica per vedere la versione aggiornata'
              : `Salvataggio non riuscito (${risposta.status})`;
          setSalvataggio({ tipo: 'ERRORE', messaggio });
          return;
        }

        const corpo = (await risposta.json()) as { stato: StatoAttivitaMemorizzato; versione: number };
        setStatiLocali((m) =>
          new Map(m).set(attivita.id, { stato: corpo.stato, versione: corpo.versione }),
        );
        setSalvataggio({ tipo: 'SALVATO' });
        annulla.registra({
          attivitaId: attivita.id,
          descrizione: `stato di ${nomeTipoDi(attivita.tipoAttivitaId)}`,
          ripristino: {
            tipo: 'STATO',
            stato: statoPrecedente,
            causaleBlocco: attivita.causaleBlocco,
          },
          versione: corpo.versione,
        });
      } catch {
        setStatiLocali((m) =>
          new Map(m).set(attivita.id, { stato: statoPrecedente, versione: versionePrecedente }),
        );
        setSalvataggio({ tipo: 'ERRORE', messaggio: 'Rete non raggiungibile' });
      }
    },
    [],
  );

  const applicaRilascio = useCallback(
    async ({ origine, bersaglio }: EsitoRilascio) => {
      if (bersaglio.personaId === null || bersaglio.giorno === null) return;

      const corpo: Record<string, unknown> = { versione: origine.versione };
      if (origine.tipo === 'RIDIMENSIONA') {
        corpo.dataFine = bersaglio.giorno;
      } else {
        corpo.personaId = bersaglio.personaId;
        corpo.dataInizio = bersaglio.giorno;
      }

      const primaDi: Ripristino = {
        tipo: 'PIANIFICAZIONE',
        personaId: origine.personaIdPrecedente,
        dataInizio: origine.dataInizio,
        stimaOre: origine.stimaOre,
      };

      setSalvataggio({ tipo: 'IN_CORSO' });
      try {
        const risposta = await fetch(`/api/attivita/${origine.attivitaId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(corpo),
        });

        if (!risposta.ok) {
          const dettaglio = (await risposta.json().catch(() => null)) as
            | { errore?: string; problemi?: { motivo: string }[] }
            | null;
          const messaggio =
            risposta.status === 409
              ? 'Modificata da un altro utente: la vista si sta aggiornando'
              : (dettaglio?.problemi?.[0]?.motivo ?? dettaglio?.errore ?? 'Operazione non riuscita');
          setSalvataggio({ tipo: 'ERRORE', messaggio });
          setAvviso(messaggio);
          router.refresh();
          return;
        }

        const esito = (await risposta.json()) as {
          aggiornate: { id: string }[];
          problemi: { motivo: string }[];
          versioni: Record<string, number>;
        };
        setSalvataggio({ tipo: 'SALVATO' });
        const nuovaVersione = esito.versioni[origine.attivitaId];
        if (nuovaVersione !== undefined) {
          annulla.registra({
            attivitaId: origine.attivitaId,
            descrizione: origine.etichetta,
            ripristino: primaDi,
            versione: nuovaVersione,
          });
        }
        setAvviso(
          esito.problemi.length > 0
            ? `Catena interrotta: ${esito.problemi[0]?.motivo ?? ''}`
            : esito.aggiornate.length > 1
              ? `Riprogrammate ${esito.aggiornate.length} attivita della catena`
              : null,
        );
        router.refresh();
      } catch {
        setSalvataggio({ tipo: 'ERRORE', messaggio: 'Rete non raggiungibile' });
        setAvviso('Rete non raggiungibile: la modifica non e stata salvata');
      }
    },
    [router, annulla],
  );

  const eseguiAnnulla = useCallback(async () => {
    const azione = annulla.ultima;
    if (!azione) return;
    annulla.rimuoviUltima();
    setSalvataggio({ tipo: 'IN_CORSO' });

    const { url, corpo } =
      azione.ripristino.tipo === 'STATO'
        ? {
            url: `/api/attivita/${azione.attivitaId}/stato`,
            corpo: {
              stato: azione.ripristino.stato,
              causaleBlocco: azione.ripristino.causaleBlocco,
              versione: azione.versione,
            },
          }
        : {
            url: `/api/attivita/${azione.attivitaId}`,
            corpo: {
              versione: azione.versione,
              personaId: azione.ripristino.personaId,
              ...(azione.ripristino.personaId === null
                ? {}
                : {
                    dataInizio: azione.ripristino.dataInizio,
                    stimaOre: azione.ripristino.stimaOre,
                  }),
            },
          };

    try {
      const risposta = await fetch(url, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (!risposta.ok) {
        const messaggio =
          risposta.status === 409
            ? 'Non si puo annullare: la riga e stata modificata da qualcun altro'
            : `Annullamento non riuscito (${risposta.status})`;
        setSalvataggio({ tipo: 'ERRORE', messaggio });
        setAvviso(messaggio);
        annulla.svuota();
        router.refresh();
        return;
      }
      setSalvataggio({ tipo: 'SALVATO' });
      setAvviso(`Annullato: ${azione.descrizione}`);
      setStatiLocali(new Map());
      router.refresh();
    } catch {
      setSalvataggio({ tipo: 'ERRORE', messaggio: 'Rete non raggiungibile' });
      annulla.svuota();
    }
  }, [annulla, router]);

  const { stato: trascinamento, inizia: iniziaTrascinamento } = useTrascinamento({
    larghezzaGiorno: definizione.larghezzaGiorno,
    finestraDa,
    onRilascio: (esito) => void applicaRilascio(esito),
  });

  const apriRevisione = useCallback(
    async (offertaId: string) => {
      setSalvataggio({ tipo: 'IN_CORSO' });
      try {
        const risposta = await fetch(`/api/offerte/${offertaId}/revisione`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ motivo: null }),
        });
        if (!risposta.ok) {
          const dettaglio = (await risposta.json().catch(() => null)) as { errore?: string } | null;
          const messaggio = dettaglio?.errore ?? `Operazione non riuscita (${risposta.status})`;
          setSalvataggio({ tipo: 'ERRORE', messaggio });
          setAvviso(messaggio);
          return;
        }
        const creata = (await risposta.json()) as { numero: number; dataFine: string };
        setSalvataggio({ tipo: 'SALVATO' });
        setAvviso(
          `Revisione ${creata.numero} aperta: nuova attivita fino al ${creata.dataFine}`,
        );
        router.refresh();
      } catch {
        setSalvataggio({ tipo: 'ERRORE', messaggio: 'Rete non raggiungibile' });
        setAvviso('Rete non raggiungibile: la revisione non e stata aperta');
      }
    },
    [router],
  );

  const iniziaGesto = useCallback(
    (origine: OrigineGesto, evento: React.PointerEvent) => {
      // Chi non pianifica puo selezionare una barra ma non spostarla.
      if (!puoSpostare) return;
      iniziaTrascinamento(origine, evento);
    },
    [iniziaTrascinamento, puoSpostare],
  );

  // Tasti rapidi 1-4 sull'attivita selezionata: M7, avanzamento a un click.
  useEffect(() => {
    function suTasto(e: KeyboardEvent): void {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        void eseguiAnnulla();
        return;
      }
      if ((e.key === 'n' || e.key === 'N') && puoCreare) {
        e.preventDefault();
        setMostraNuovaRdo(true);
        return;
      }
      if (attivitaSelezionata === null) return;
      const mappa: Readonly<Record<string, StatoAttivitaMemorizzato>> = {
        '1': 'NON_INIZIATA',
        '2': 'IN_CORSO',
        '3': 'BLOCCATA',
        '4': 'COMPLETATA',
      };
      const nuovo = mappa[e.key];
      if (!nuovo) return;
      e.preventDefault();
      void cambiaStato(attivitaSelezionata, nuovo);
    }
    window.addEventListener('keydown', suTasto);
    return () => window.removeEventListener('keydown', suTasto);
  }, [attivitaSelezionata, cambiaStato, eseguiAnnulla, puoCreare]);

  const azzeraFiltri = useCallback(() => {
    setFiltroPersona('');
    setFiltroCliente('');
    setFiltroKam('');
    setFiltroStato('ATTIVE');
  }, []);

  const filtriAttivi =
    filtroPersona !== '' || filtroCliente !== '' || filtroKam !== '' || filtroStato !== 'ATTIVE';

  const larghezzaTimeline = giorni.length * definizione.larghezzaGiorno;
  const colonnaOggi = colonnaDelGiorno(finestraDa, finestraA, dati.oggi);

  const kamDisponibili = useMemo(
    () => dati.persone.filter((p) => dati.offerte.some((o) => o.kamId === p.id)),
    [dati.persone, dati.offerte],
  );

  return (
    <div className="flex h-screen flex-col">
      <Intestazione
        tema={tema}
        onCambiaTema={cambiaTema}
        salvataggio={salvataggio}
        utente={dati.utente}
        vedeImpostazioni={puoModificareImpostazioni(dati.utente.ruolo)}
      />

      {dati.vedeTuttiICarichi ? null : (
        <p
          className="border-b px-4 py-1.5 text-[11px]"
          style={{
            borderColor: 'var(--bordo)',
            background: 'var(--sfondo-tenue)',
            color: 'var(--testo-tenue)',
          }}
        >
          Vedi il tuo carico. Il carico nominativo dei colleghi e riservato al responsabile di
          divisione: usa le viste per offerta o per cliente per il quadro d&apos;insieme.
        </p>
      )}

      <div
        className="flex flex-wrap items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
      >
        {puoCreare ? (
          <button
            type="button"
            onClick={() => setMostraNuovaRdo(true)}
            title="Nuova richiesta di offerta (tasto N)"
            className="inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[12px] font-medium"
            style={{ background: 'var(--accento)', borderColor: 'var(--accento)', color: '#fff' }}
          >
            + Nuova RDO
          </button>
        ) : null}

        <Pulsante
          onClick={() => void eseguiAnnulla()}
          disabilitato={annulla.ultima === null || !puoSpostare}
          titolo={
            annulla.ultima === null
              ? 'Niente da annullare'
              : `Annulla: ${annulla.ultima.descrizione} (Ctrl+Z)`
          }
        >
          ↶ Annulla
        </Pulsante>

        <span className="mx-1 h-5 w-px" style={{ background: 'var(--bordo)' }} />

        <Pulsante
          onClick={() => setAncora(aggiungiGiorni(ancora, -definizione.giorniVisibili))}
          titolo="Periodo precedente"
        >
          ‹
        </Pulsante>
        <Pulsante
          onClick={() => setAncora(inizioSettimana(aggiungiGiorni(dati.oggi, -14)))}
          titolo="Torna a oggi"
        >
          Oggi
        </Pulsante>
        <Pulsante
          onClick={() => setAncora(aggiungiGiorni(ancora, definizione.giorniVisibili))}
          titolo="Periodo successivo"
        >
          ›
        </Pulsante>

        <span className="px-1 text-[12px]" style={{ color: 'var(--testo-tenue)' }}>
          {formatoBreve(finestraDa)} — {formatoBreve(finestraA)}
        </span>

        <span className="mx-1 h-5 w-px" style={{ background: 'var(--bordo)' }} />

        <GruppoSegmentato
          valori={LIVELLI_ZOOM}
          etichette={{
            FITTO: ZOOM.FITTO.etichetta,
            NORMALE: ZOOM.NORMALE.etichetta,
            COMPATTO: ZOOM.COMPATTO.etichetta,
          }}
          selezionato={zoom}
          onCambia={setZoom}
        />

        <GruppoSegmentato
          valori={['RISORSA', 'OFFERTA', 'CLIENTE', 'KAM'] as const}
          etichette={ETICHETTE_RAGGRUPPAMENTO}
          selezionato={modo}
          onCambia={setModo}
        />

        <GruppoSegmentato
          valori={['TUTTI', 'ATTIVE', 'COMPLETATE'] as const}
          etichette={ETICHETTE_FILTRO_STATO}
          selezionato={filtroStato}
          onCambia={setFiltroStato}
        />

        <span className="mx-1 h-5 w-px" style={{ background: 'var(--bordo)' }} />

        <Selettore
          etichetta="Risorsa"
          valore={filtroPersona}
          opzioni={dati.persone.map((p) => ({ valore: p.id, testo: `${p.cognome} ${p.nome}` }))}
          onCambia={setFiltroPersona}
        />
        <Selettore
          etichetta="Cliente"
          valore={filtroCliente}
          opzioni={dati.clienti.map((c) => ({ valore: c.id, testo: c.nome }))}
          onCambia={setFiltroCliente}
        />
        <Selettore
          etichetta="KAM"
          valore={filtroKam}
          opzioni={kamDisponibili.map((p) => ({ valore: p.id, testo: `${p.cognome} ${p.nome}` }))}
          onCambia={setFiltroKam}
        />

        {filtriAttivi ? (
          <Pulsante onClick={azzeraFiltri} titolo="Azzera i filtri">
            ✕
          </Pulsante>
        ) : null}

        <span className="ml-auto text-[11px]" style={{ color: 'var(--testo-debole)' }}>
          {attivitaFiltrate.length} attivita · {gruppi.length} righe
        </span>
      </div>

      <Legenda tipi={dati.tipiAttivita} />

      <div className="flex min-h-0 flex-1">
        <div ref={contenitore} className="min-w-0 flex-1 overflow-auto">
          <div style={{ width: LARGHEZZA_GRIGLIA + larghezzaTimeline, minWidth: '100%' }}>
            <div className="sticky top-0 z-40 flex" style={{ background: 'var(--sfondo-pannello)' }}>
              <div
                className="sticky left-0 z-50 shrink-0 border-r"
                style={{
                  width: LARGHEZZA_GRIGLIA,
                  borderColor: 'var(--bordo-forte)',
                  background: 'var(--sfondo-pannello)',
                }}
              >
                <div
                  className="flex h-full items-end px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--testo-debole)' }}
                >
                  {modo === 'RISORSA' ? 'Risorsa e carico' : ETICHETTE_RAGGRUPPAMENTO[modo]}
                </div>
              </div>
              <IntestazioneTempo
                giorni={giorni}
                larghezzaGiorno={definizione.larghezzaGiorno}
                mostraGiorni={definizione.mostraGiorni}
              />
            </div>

            <div className="relative">
              {colonnaOggi !== null ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 bottom-0 z-20 w-px"
                  style={{
                    left: LARGHEZZA_GRIGLIA + colonnaOggi * definizione.larghezzaGiorno,
                    background: 'var(--oggi)',
                  }}
                />
              ) : null}

              {gruppi.length === 0 ? (
                <p className="px-4 py-8 text-[13px]" style={{ color: 'var(--testo-debole)' }}>
                  Nessuna attivita nel periodo con i filtri attivi.
                </p>
              ) : (
                gruppiVisualizzati.map((gruppo) => (
                  <RigaGruppo
                    key={gruppo.chiave}
                    gruppo={gruppo}
                    giorni={giorni}
                    finestraDa={finestraDa}
                    finestraA={finestraA}
                    larghezzaGiorno={definizione.larghezzaGiorno}
                    modo={modo}
                    calendario={calendario}
                    coloriTipo={coloriTipo}
                    nomiTipo={nomiTipo}
                    allocazione={
                      gruppo.personaId !== null ? allocazione.get(gruppo.personaId) : undefined
                    }
                    offerteMappa={offerteMappa}
                    dipendenze={dati.dipendenze}
                    colonneIrregolari={colonneIrregolari}
                    sfasamentoSettimana={sfasamentoSettimana}
                    oggi={dati.oggi}
                    selezionata={selezionata}
                    idInMovimento={trascinamento?.origine.attivitaId ?? null}
                    onSeleziona={setSelezionata}
                    onIniziaGesto={iniziaGesto}
                  />
                ))
              )}
              {gruppiTroncati ? (
                <p
                  className="px-4 py-3 text-[12px]"
                  style={{ color: 'var(--semaforo-ambra)' }}
                  role="status"
                  data-prova="troncamento"
                >
                  Mostrate {MAX_GRUPPI_LEGGIBILI} righe su {gruppi.length}. Questa vista e
                  leggibile solo filtrata: restringi per cliente, KAM o risorsa, oppure usa la
                  vista per risorsa.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <CodaDaAssegnare
          voci={coda}
          oggi={dati.oggi}
          selezionata={selezionata}
          inMovimento={trascinamento?.origine.attivitaId ?? null}
          onSeleziona={setSelezionata}
          onIniziaAssegnazione={(voce, evento) =>
            iniziaGesto(
              {
                tipo: 'ASSEGNA',
                attivitaId: voce.attivitaId,
                versione: voce.versione,
                dataInizio: null,
                personaIdPrecedente: null,
                stimaOre: voce.stimaOre,
                etichetta: `${voce.offerta.descrizione} · ${voce.etichetta}`,
              },
              evento,
            )
          }
        />
      </div>

      {avviso ? (
        <div
          role="status"
          data-prova="avviso"
          className="flex items-center gap-2 border-t px-4 py-1.5 text-[12px]"
          style={{
            borderColor: 'var(--bordo)',
            background: 'var(--sfondo-tenue)',
            color: 'var(--testo-tenue)',
          }}
        >
          {avviso}
          <button
            type="button"
            onClick={() => setAvviso(null)}
            className="ml-auto text-[12px]"
            style={{ color: 'var(--testo-debole)' }}
          >
            ✕
          </button>
        </div>
      ) : null}

      {trascinamento?.attivo ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[90] rounded-[4px] px-2 py-1 text-[11px]"
          style={{
            left: trascinamento.x + 12,
            top: trascinamento.y + 12,
            background: 'var(--testo)',
            color: 'var(--sfondo-pannello)',
            boxShadow: 'var(--ombra-pannello)',
            maxWidth: 320,
          }}
        >
          {trascinamento.origine.tipo === 'RIDIMENSIONA'
            ? `Durata fino al ${trascinamento.bersaglio.giorno ?? '—'}`
            : trascinamento.bersaglio.personaId === null
              ? 'Rilascia su una corsia risorsa'
              : `${trascinamento.origine.etichetta} → ${
                  dati.persone.find((p) => p.id === trascinamento.bersaglio.personaId)?.cognome ??
                  ''
                } dal ${trascinamento.bersaglio.giorno ?? '—'}`}
        </div>
      ) : null}

      {mostraNuovaRdo ? (
        <ModuloNuovaRdo
          dati={dati}
          onChiudi={() => setMostraNuovaRdo(false)}
          onCreata={(codice) => {
            setMostraNuovaRdo(false);
            setAvviso(`Richiesta ${codice} creata: ora e nella coda Da assegnare`);
            router.refresh();
          }}
        />
      ) : null}

      {attivitaSelezionata ? (
        <DettaglioSelezione
          attivita={attivitaSelezionata}
          offerta={offerteMappa.get(attivitaSelezionata.offertaId) ?? null}
          persone={dati.persone}
          oggi={dati.oggi}
          calendario={calendario}
          utente={dati.utente}
          nomeTipo={nomeTipoDi(attivitaSelezionata.tipoAttivitaId)}
          onCambiaStato={(nuovo) => void cambiaStato(attivitaSelezionata, nuovo)}
          onApriRevisione={() => void apriRevisione(attivitaSelezionata.offertaId)}
          onChiudi={() => setSelezionata(null)}
          onAvviso={setAvviso}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Intestazione({
  tema,
  onCambiaTema,
  salvataggio,
  utente,
  vedeImpostazioni,
}: {
  tema: 'chiaro' | 'scuro';
  onCambiaTema: () => void;
  salvataggio: StatoSalvataggio;
  utente: PianoDati['utente'];
  vedeImpostazioni: boolean;
}) {
  return (
    <header
      className="flex items-center gap-3 border-b px-4 py-2"
      style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
    >
      <span className="text-[15px] font-semibold tracking-tight">righi solutions</span>
      <span className="text-[14px]" style={{ color: 'var(--testo-tenue)' }}>
        Pianificazione Offerte
      </span>
      <span
        className="rounded-full px-2 py-[1px] text-[10px] font-semibold"
        style={{ background: 'var(--accento-tenue)', color: 'var(--accento)' }}
      >
        v2 alpha
      </span>

      <div className="ml-auto flex items-center gap-3">
        <IndicatoreSalvataggio stato={salvataggio} />
        <Link
          href="/dashboard"
          className="inline-flex h-7 items-center rounded-md border px-2.5 text-[12px] font-medium"
          style={{
            background: 'var(--sfondo-pannello)',
            borderColor: 'var(--bordo)',
            color: 'var(--testo)',
          }}
        >
          Dashboard
        </Link>
        {vedeImpostazioni ? (
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
        ) : null}

        <span
          className="flex items-center gap-1.5 text-[12px]"
          title={`${utente.nome} ${utente.cognome} · ${ETICHETTE_RUOLO[utente.ruolo]}`}
        >
          <Avatar
            iniziali={`${utente.nome.charAt(0)}${utente.cognome.charAt(0)}`}
            colore="var(--accento)"
          />
          <span style={{ color: 'var(--testo-tenue)' }}>{ETICHETTE_RUOLO[utente.ruolo]}</span>
        </span>

        <Pulsante onClick={() => void esci()} titolo="Esci">
          ⏻
        </Pulsante>
        <Pulsante onClick={onCambiaTema} titolo="Cambia tema">
          {tema === 'scuro' ? '☀' : '☾'}
        </Pulsante>
      </div>
    </header>
  );
}

function IndicatoreSalvataggio({ stato }: { stato: StatoSalvataggio }) {
  if (stato.tipo === 'RIPOSO') return null;

  const configurazione = {
    IN_CORSO: { testo: 'Salvataggio…', colore: 'var(--testo-tenue)' },
    SALVATO: { testo: 'Salvato', colore: 'var(--semaforo-verde)' },
    ERRORE: { testo: 'Non salvato', colore: 'var(--semaforo-rosso)' },
  }[stato.tipo];

  return (
    <span
      className="flex items-center gap-1.5 text-[12px]"
      data-prova="salvataggio"
      style={{ color: configurazione.colore }}
      title={stato.tipo === 'ERRORE' ? stato.messaggio : undefined}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full"
        style={{ background: configurazione.colore }}
      />
      {configurazione.testo}
    </span>
  );
}

function RigaGruppo({
  gruppo,
  giorni,
  finestraDa,
  finestraA,
  larghezzaGiorno,
  modo,
  calendario,
  coloriTipo,
  nomiTipo,
  allocazione,
  offerteMappa,
  dipendenze,
  colonneIrregolari,
  sfasamentoSettimana,
  oggi,
  selezionata,
  idInMovimento,
  onSeleziona,
  onIniziaGesto,
}: {
  gruppo: ReturnType<typeof costruisciGruppi>[number];
  giorni: readonly GiornoVista[];
  finestraDa: DataCivile;
  finestraA: DataCivile;
  larghezzaGiorno: number;
  modo: Raggruppamento;
  calendario: CalendarioLavorativo;
  coloriTipo: ReadonlyMap<string, string>;
  nomiTipo: ReadonlyMap<string, string>;
  allocazione: ReadonlyMap<DataCivile, number> | undefined;
  offerteMappa: ReadonlyMap<string, PianoDati['offerte'][number]>;
  dipendenze: readonly PianoDati['dipendenze'][number][];
  colonneIrregolari: {
    readonly festivita: readonly { readonly colonna: number; readonly nome: string }[];
    readonly oggiColonna: number | null;
  };
  sfasamentoSettimana: number;
  oggi: DataCivile;
  selezionata: string | null;
  idInMovimento: string | null;
  onSeleziona: (id: string) => void;
  onIniziaGesto: (origine: OrigineGesto, evento: React.PointerEvent) => void;
}) {
  const visibili = useMemo(
    () =>
      gruppo.attivita.filter(
        (a) =>
          a.dataInizio !== null &&
          a.dataFine !== null &&
          confronta(a.dataInizio, finestraA) <= 0 &&
          confronta(a.dataFine, finestraDa) >= 0,
      ),
    [gruppo.attivita, finestraDa, finestraA],
  );

  const impilate = useMemo(
    () =>
      impilaInCorsie(
        visibili.map((a) => ({
          id: a.id,
          inizio: a.dataInizio as DataCivile,
          fine: a.dataFine as DataCivile,
          attivita: a,
        })),
      ),
    [visibili],
  );

  const carico: readonly CaricoGiorno[] | null = useMemo(() => {
    if (gruppo.personaId === null) return null;
    return caricoGiornaliero(calendario, gruppo.personaId, finestraDa, finestraA, allocazione);
  }, [gruppo.personaId, calendario, finestraDa, finestraA, allocazione]);

  const riepilogo = useMemo(() => (carico ? aggregaCarico(carico) : null), [carico]);

  /**
   * Collegamenti Fine-Inizio disegnabili: entrambi gli estremi devono stare in
   * questo gruppo e nella finestra. Si disegnano dopo l'impilamento perche la
   * corsia di arrivo e nota solo allora.
   */
  const collegamenti = useMemo(() => {
    const posizioni = new Map<string, { corsia: number; inizio: DataCivile; fine: DataCivile }>();
    for (const { elemento, corsia } of impilate.elementi) {
      posizioni.set(elemento.id, { corsia, inizio: elemento.inizio, fine: elemento.fine });
    }
    const tracciati: {
      chiave: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }[] = [];
    for (const d of dipendenze) {
      const da = posizioni.get(d.predecessoreId);
      const a = posizioni.get(d.successoreId);
      if (!da || !a) continue;
      const colonnaFine = colonnaDelGiorno(finestraDa, finestraA, da.fine);
      const colonnaInizio = colonnaDelGiorno(finestraDa, finestraA, a.inizio);
      if (colonnaFine === null || colonnaInizio === null) continue;
      tracciati.push({
        chiave: `${d.predecessoreId}-${d.successoreId}`,
        x1: (colonnaFine + 1) * larghezzaGiorno - 1,
        y1: da.corsia * ALTEZZA_CORSIA + ALTEZZA_CORSIA / 2,
        x2: colonnaInizio * larghezzaGiorno + 1,
        y2: a.corsia * ALTEZZA_CORSIA + ALTEZZA_CORSIA / 2,
      });
    }
    return tracciati;
  }, [impilate.elementi, dipendenze, finestraDa, finestraA, larghezzaGiorno]);

  /**
   * Testo della barra. Dipende dal raggruppamento, perche cio che il gruppo gia
   * dichiara non va ripetuto sulla barra: nella corsia di una persona serve
   * sapere di chi e il lavoro, nella banda di una offerta serve sapere che
   * attivita e.
   */
  const etichettaDi = useCallback(
    (cliente: string, descrizione: string, tipoAttivita: string): string => {
      if (modo === 'OFFERTA') return tipoAttivita;
      if (modo === 'CLIENTE') return descrizione;
      return cliente === '' ? descrizione : `${cliente} · ${descrizione}`;
    },
    [modo],
  );

  /** Pixel liberi a destra di ogni barra, fino alla successiva della corsia. */
  const spazioDestraPerBarra = useMemo(() => {
    const perCorsia = new Map<number, { id: string; sinistra: number; destra: number }[]>();
    for (const { elemento, corsia } of impilate.elementi) {
      const c = collocaBarra(
        finestraDa,
        finestraA,
        larghezzaGiorno,
        elemento.inizio,
        elemento.fine,
      );
      if (!c) continue;
      const elenco = perCorsia.get(corsia) ?? [];
      elenco.push({ id: elemento.id, sinistra: c.sinistra, destra: c.sinistra + c.larghezza });
      perCorsia.set(corsia, elenco);
    }

    const larghezzaTotale = giorni.length * larghezzaGiorno;
    const spazi = new Map<string, number>();
    for (const elenco of perCorsia.values()) {
      elenco.sort((a, b) => a.sinistra - b.sinistra);
      elenco.forEach((barra, indice) => {
        const successiva = elenco[indice + 1];
        spazi.set(barra.id, (successiva?.sinistra ?? larghezzaTotale) - barra.destra);
      });
    }
    return spazi;
  }, [impilate.elementi, finestraDa, finestraA, larghezzaGiorno, giorni.length]);

  const numeroCorsie = Math.max(1, impilate.corsie);
  const altezzaTotale = (carico ? ALTEZZA_CAPACITA : 0) + numeroCorsie * ALTEZZA_CORSIA;

  return (
    <div className="flex border-b" style={{ borderColor: 'var(--bordo)' }}>
      <div
        className="sticky left-0 z-10 shrink-0 border-r px-3 py-1.5"
        style={{
          width: LARGHEZZA_GRIGLIA,
          minHeight: altezzaTotale,
          borderColor: 'var(--bordo-forte)',
          background: 'var(--sfondo-pannello)',
        }}
      >
        <div className="flex items-center gap-1.5">
          {gruppo.avatar ? (
            <Avatar
              iniziali={gruppo.avatar.iniziali}
              colore={gruppo.avatar.colore}
              titolo={gruppo.avatar.titolo}
            />
          ) : (
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: gruppo.colore }}
            />
          )}
          <span className="truncate text-[12px] font-semibold" title={gruppo.titolo}>
            {gruppo.titolo}
          </span>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {gruppo.etichette.map((e) => (
            <Chip
              key={e.testo}
              titolo={e.titolo}
              pieno={e.pieno ?? false}
              colore={e.allarme === true ? 'var(--semaforo-rosso)' : undefined}
            >
              {e.testo}
            </Chip>
          ))}
          {riepilogo ? (
            <Chip
              titolo={`Nel periodo: ${formatoOre(riepilogo.oreAllocate)} allocate su ${formatoOre(
                riepilogo.oreDisponibili,
              )} disponibili`}
              colore={
                riepilogo.fascia === 'SOVRACCARICO'
                  ? 'var(--semaforo-rosso)'
                  : riepilogo.fascia === 'PIENO'
                    ? 'var(--semaforo-ambra)'
                    : undefined
              }
            >
              {formatoPercentuale(riepilogo.percentuale)}
            </Chip>
          ) : null}
        </div>
      </div>

      <div className="relative shrink-0" style={{ minHeight: altezzaTotale }}>
        <div
          className="griglia-giorni pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={
            {
              '--larghezza-giorno': `${larghezzaGiorno}px`,
              '--sfasamento-settimana': `${sfasamentoSettimana}px`,
            } as React.CSSProperties
          }
        >
          {colonneIrregolari.festivita.map((f) => (
            <span
              key={f.colonna}
              className="colonna-festivita"
              style={{ left: f.colonna * larghezzaGiorno, width: larghezzaGiorno }}
            />
          ))}
          {colonneIrregolari.oggiColonna !== null ? (
            <span
              className="colonna-oggi"
              style={{
                left: colonneIrregolari.oggiColonna * larghezzaGiorno,
                width: larghezzaGiorno,
              }}
            />
          ) : null}
        </div>

        {carico ? (
          <RigaCapacita
            carico={carico}
            larghezzaGiorno={larghezzaGiorno}
            altezza={ALTEZZA_CAPACITA}
          />
        ) : null}

        <div
          className="relative"
          style={{ height: numeroCorsie * ALTEZZA_CORSIA }}
          data-corsia-persona={gruppo.personaId ?? undefined}
        >
          {collegamenti.length > 0 ? (
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ overflow: 'visible' }}
            >
              {collegamenti.map((c) => (
                <path
                  key={c.chiave}
                  d={`M ${c.x1} ${c.y1} C ${c.x1 + 14} ${c.y1}, ${c.x2 - 14} ${c.y2}, ${c.x2} ${c.y2}`}
                  fill="none"
                  stroke="var(--testo-debole)"
                  strokeWidth={1}
                  opacity={0.55}
                />
              ))}
            </svg>
          ) : null}
          {impilate.elementi.map(({ elemento, corsia }) => {
            const a = elemento.attivita;
            const inizio = a.dataInizio as DataCivile;
            const fine = a.dataFine as DataCivile;
            const collocazione = collocaBarra(finestraDa, finestraA, larghezzaGiorno, inizio, fine);
            if (!collocazione) return null;

            const offerta = offerteMappa.get(a.offertaId);
            const nonLavorativi: number[] = [];
            // Il tratteggio dei giorni non lavorativi richiede il calendario
            // della persona: per gli assegnatari che non siamo autorizzati a
            // vedere nominativamente non lo abbiamo, e la barra resta piena.
            if (a.personaId !== null && calendario.conoscePersona(a.personaId)) {
              for (const giorno of giorniTra(inizio, fine)) {
                const colonna = colonnaDelGiorno(finestraDa, finestraA, giorno);
                if (colonna === null) continue;
                if (!calendario.eGiornoLavorativo(a.personaId, giorno)) nonLavorativi.push(colonna);
              }
            }

            const nomeTipo = nomiTipo.get(a.tipoAttivitaId) ?? 'Attivita';
            const margine = valutaMargine(fine, offerta?.dataScadenzaCliente ?? null, {
              calendario,
              personaId:
                a.personaId !== null && calendario.conoscePersona(a.personaId)
                  ? a.personaId
                  : null,
            });

            const barra: DatiBarra = {
              id: a.id,
              etichetta: etichettaDi(
                offerta?.cliente ?? '',
                offerta?.descrizione ?? '',
                nomeTipo,
              ),
              tipoAttivita: nomeTipo,
              offertaCodice: offerta?.codice ?? '',
              offertaDescrizione: offerta?.descrizione ?? '',
              cliente: offerta?.cliente ?? '',
              persona: null,
              coloreTipo: coloriTipo.get(a.tipoAttivitaId) ?? 'var(--accento)',
              coloreOfferta: offerta?.colore ?? 'var(--accento)',
              stato: statoVisualizzato(
                { stato: a.stato, dataFine: a.dataFine, iniziataIl: a.iniziataIl },
                oggi,
              ),
              semaforo: margine.semaforo,
              scadenza: offerta?.dataScadenzaCliente ?? null,
              stimaOre: a.stimaOre,
              dataInizio: inizio,
              dataFine: fine,
              giorniNonLavorativi: nonLavorativi,
            };

            return (
              <BarraAttivita
                key={a.id}
                dati={barra}
                collocazione={collocazione}
                larghezzaGiorno={larghezzaGiorno}
                altezza={ALTEZZA_BARRA}
                alto={corsia * ALTEZZA_CORSIA + (ALTEZZA_CORSIA - ALTEZZA_BARRA) / 2}
                spazioDestra={spazioDestraPerBarra.get(a.id) ?? 0}
                selezionata={selezionata === a.id}
                inMovimento={idInMovimento === a.id}
                onSeleziona={onSeleziona}
                onIniziaSpostamento={(evento) =>
                  onIniziaGesto(
                    {
                      tipo: 'SPOSTA',
                      attivitaId: a.id,
                      versione: a.versione,
                      dataInizio: inizio,
                      personaIdPrecedente: a.personaId,
                      stimaOre: a.stimaOre,
                      etichetta: `${offerta?.descrizione ?? ''} · ${nomeTipo}`,
                    },
                    evento,
                  )
                }
                onIniziaRidimensionamento={(evento) =>
                  onIniziaGesto(
                    {
                      tipo: 'RIDIMENSIONA',
                      attivitaId: a.id,
                      versione: a.versione,
                      dataInizio: inizio,
                      personaIdPrecedente: a.personaId,
                      stimaOre: a.stimaOre,
                      etichetta: `${offerta?.descrizione ?? ''} · ${nomeTipo}`,
                    },
                    evento,
                  )
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DettaglioSelezione({
  attivita,
  offerta,
  persone,
  oggi,
  calendario,
  utente,
  nomeTipo,
  onCambiaStato,
  onApriRevisione,
  onChiudi,
  onAvviso,
}: {
  attivita: AttivitaVista;
  offerta: PianoDati['offerte'][number] | null;
  persone: readonly PianoDati['persone'][number][];
  oggi: DataCivile;
  calendario: CalendarioLavorativo;
  utente: PianoDati['utente'];
  nomeTipo: string;
  onCambiaStato: (nuovo: StatoAttivitaMemorizzato) => void;
  onApriRevisione: () => void;
  onChiudi: () => void;
  onAvviso: (messaggio: string | null) => void;
}) {
  const persona = persone.find((p) => p.id === attivita.personaId) ?? null;
  const margine = valutaMargine(attivita.dataFine, offerta?.dataScadenzaCliente ?? null, {
    calendario,
    personaId:
      attivita.personaId !== null && calendario.conoscePersona(attivita.personaId)
        ? attivita.personaId
        : null,
  });
  const derivato = statoVisualizzato(
    { stato: attivita.stato, dataFine: attivita.dataFine, iniziataIl: attivita.iniziataIl },
    oggi,
  );

  const stati: readonly StatoAttivitaMemorizzato[] = [
    'NON_INIZIATA',
    'IN_CORSO',
    'BLOCCATA',
    'COMPLETATA',
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-3 border-t px-4 py-2"
      style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-pannello)' }}
    >
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: offerta?.colore ?? 'var(--accento)' }}
      />
      <div className="min-w-0">
        {/* Cliente e offerta per primi e piu grandi: sono l'identita, il resto
            e contorno. Era il difetto segnalato dal committente. */}
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 text-[13px] font-semibold">{offerta?.cliente ?? '—'}</span>
          <span className="truncate text-[13px]">{offerta?.descrizione ?? 'Offerta'}</span>
          <span className="shrink-0 text-[11px]" style={{ color: 'var(--testo-debole)' }}>
            {offerta?.codice ?? ''}
          </span>
        </div>
        <div className="truncate text-[11px]" style={{ color: 'var(--testo-tenue)' }}>
          {nomeTipo} · {formatoOre(attivita.stimaOre)} ·{' '}
          {persona ? `${persona.nome} ${persona.cognome}` : 'Non assegnata'}
          {attivita.dataInizio && attivita.dataFine
            ? ` · ${formatoBreve(attivita.dataInizio)} — ${formatoBreve(attivita.dataFine)}`
            : ''}
        </div>
      </div>

      {offerta?.dataScadenzaCliente ? (
        <span
          className="rounded-md border px-2 py-1 text-[11px]"
          style={{
            borderColor: COLORE_SEMAFORO[margine.semaforo],
            color: COLORE_SEMAFORO[margine.semaforo],
          }}
          title={`Scadenza cliente ${formatoBreve(offerta.dataScadenzaCliente)} · ${
            ETICHETTE_SEMAFORO[margine.semaforo]
          }`}
        >
          Scadenza {formatoBreve(offerta.dataScadenzaCliente)}
          {margine.margineGiorniLavorativi !== null
            ? ` · margine ${margine.margineGiorniLavorativi} gg lav.`
            : ''}
        </span>
      ) : null}

      <div className="ml-auto flex items-center gap-1.5">
        <span className="text-[11px]" style={{ color: 'var(--testo-debole)' }}>
          Stato: {ETICHETTE_STATO[derivato]}
        </span>
        {stati.map((s, indice) => (
          <Pulsante
            key={s}
            onClick={() => onCambiaStato(s)}
            attivo={attivita.stato === s}
            titolo={`${ETICHETTE_STATO[s]} (tasto ${indice + 1})`}
          >
            {ETICHETTE_STATO[s]}
          </Pulsante>
        ))}

        {puoRegistrareConsuntivo(utente.ruolo, utente.id, attivita.personaId) ? (
          <CampoConsuntivo attivita={attivita} onAvviso={onAvviso} />
        ) : null}

        <span className="mx-1 h-5 w-px" style={{ background: 'var(--bordo)' }} />

        <Pulsante
          onClick={onApriRevisione}
          titolo="Il cliente ha chiesto modifiche dopo l'invio: aggiunge una attivita di revisione alla stessa persona"
        >
          + Revisione
        </Pulsante>
        <Pulsante onClick={onChiudi} titolo="Chiudi il dettaglio">
          ✕
        </Pulsante>
      </div>
    </div>
  );
}

/**
 * Registrazione delle ore effettive (S4).
 *
 * Il campo arriva precompilato con la stima: confermare costa un click, e chi
 * ha lavorato corregge solo se e andata diversamente. E' la mitigazione del
 * rischio R2 applicata al consuntivo, ed evita il dato inventato per sbrigarsi.
 *
 * Compare solo a chi ha svolto il lavoro: la regola e in
 * `puoRegistrareConsuntivo` e vale anche lato server.
 */
function CampoConsuntivo({
  attivita,
  onAvviso,
}: {
  attivita: AttivitaVista;
  onAvviso: (messaggio: string | null) => void;
}) {
  const [valore, setValore] = useState<string>(
    String(attivita.consuntivoOre ?? attivita.stimaOre),
  );
  const [inCorso, setInCorso] = useState(false);
  const registrato = attivita.consuntivoOre !== null;

  async function salva(): Promise<void> {
    const ore = Number(valore.replace(',', '.'));
    if (!Number.isFinite(ore) || ore <= 0) {
      onAvviso('Le ore effettive devono essere un numero maggiore di zero');
      return;
    }
    setInCorso(true);
    try {
      const risposta = await fetch(`/api/attivita/${attivita.id}/consuntivo`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ consuntivoOre: ore }),
      });
      if (!risposta.ok) {
        const dettaglio = (await risposta.json().catch(() => null)) as { errore?: string } | null;
        onAvviso(dettaglio?.errore ?? 'Registrazione non riuscita');
        return;
      }
      onAvviso(`Ore effettive registrate: ${formatoOre(ore)} contro ${formatoOre(attivita.stimaOre)} stimate`);
    } catch {
      onAvviso('Rete non raggiungibile: le ore non sono state registrate');
    } finally {
      setInCorso(false);
    }
  }

  return (
    <span
      className="flex items-center gap-1.5 rounded-md border px-2 py-1"
      style={{ borderColor: 'var(--bordo)', background: 'var(--sfondo-tenue)' }}
      title="Ore che ci hai messo davvero. Servono a tarare le stime predefinite."
    >
      <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--testo-debole)' }}>
        Ore effettive
      </span>
      <input
        type="number"
        min={0.5}
        step={0.5}
        value={valore}
        onChange={(e) => setValore(e.target.value)}
        className="h-6 w-[68px] rounded border px-1.5 text-[12px] tabular-nums"
        style={{ background: 'var(--sfondo)', borderColor: 'var(--bordo)', color: 'var(--testo)' }}
      />
      <button
        type="button"
        onClick={() => void salva()}
        disabled={inCorso}
        className="h-6 rounded border px-2 text-[11px] font-medium disabled:opacity-40"
        style={{
          background: registrato ? 'var(--sfondo-pannello)' : 'var(--accento)',
          borderColor: registrato ? 'var(--bordo)' : 'var(--accento)',
          color: registrato ? 'var(--testo)' : '#fff',
        }}
      >
        {registrato ? 'Aggiorna' : 'Registra'}
      </button>
    </span>
  );
}
