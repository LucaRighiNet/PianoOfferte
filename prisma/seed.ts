/**
 * Dati di prova a volume realistico.
 *
 * Par. 14.6 del piano: il requisito prestazionale (800 righe senza scatti) e la
 * verifica del renderer non sono controllabili su tre righe di esempio. Questo
 * seed genera un anno di attivita coerente con la scala dichiarata dal
 * committente: 12 persone, 30-100 offerte al mese.
 *
 * Il generatore pseudocasuale e deterministico: lo stesso seme produce sempre
 * gli stessi dati, cosi un problema di prestazioni e riproducibile.
 */
import { PrismaClient, Prisma } from '../src/generated/prisma/index.js';
import {
  aggiungiGiorni,
  daIstante,
  dataCivile,
  aDateUtc,
  differenzaGiorni,
  type DataCivile,
} from '../src/lib/data/dataCivile.js';
import {
  CalendarioLavorativo,
  type PersonaCapacita,
  type VoceIndisponibilita,
} from '../src/lib/calendario/calendarioLavorativo.js';

const db = new PrismaClient();

/** Generatore lineare congruenziale: deterministico e sufficiente per dati finti. */
function creaRandom(seme: number): () => number {
  let stato = seme >>> 0;
  return () => {
    stato = (Math.imul(stato, 1664525) + 1013904223) >>> 0;
    return stato / 4294967296;
  };
}

const random = creaRandom(20260917);

function scegli<T>(elenco: readonly T[]): T {
  const elemento = elenco[Math.floor(random() * elenco.length)];
  if (elemento === undefined) throw new Error('Elenco vuoto passato a scegli()');
  return elemento;
}

function interoTra(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

const OGGI = daIstante(new Date());
const INIZIO_PERIODO = aggiungiGiorni(OGGI, -210);
const FINE_PERIODO = aggiungiGiorni(OGGI, 120);

// --------------------------------------------------------------------------
// Anagrafiche
// --------------------------------------------------------------------------

const PERSONE = [
  { nome: 'Domenico', cognome: 'Benassi', ruolo: 'OPERATORE', ore: 8, contratto: 100, colore: '#0d9488' },
  { nome: 'Luca', cognome: 'Righi', ruolo: 'RESPONSABILE', ore: 4, contratto: 100, colore: '#16a34a' },
  { nome: 'Gianluca', cognome: 'Gusman', ruolo: 'KAM', ore: 3, contratto: 100, colore: '#0ea5e9' },
  { nome: 'Daniele', cognome: 'Tozzi', ruolo: 'KAM', ore: 3, contratto: 100, colore: '#8b5cf6' },
  { nome: 'Fabio', cognome: 'Camera', ruolo: 'KAM', ore: 3, contratto: 100, colore: '#a855f7' },
  { nome: 'Marco', cognome: 'Fabbri', ruolo: 'OPERATORE', ore: 8, contratto: 100, colore: '#f59e0b' },
  { nome: 'Elena', cognome: 'Casadei', ruolo: 'OPERATORE', ore: 6, contratto: 100, colore: '#ec4899' },
  { nome: 'Stefano', cognome: 'Montanari', ruolo: 'OPERATORE', ore: 8, contratto: 100, colore: '#ef4444' },
  { nome: 'Chiara', cognome: 'Zoli', ruolo: 'OPERATORE', ore: 4, contratto: 50, colore: '#14b8a6' },
  { nome: 'Alessandro', cognome: 'Pini', ruolo: 'OPERATORE', ore: 8, contratto: 100, colore: '#6366f1' },
  { nome: 'Giulia', cognome: 'Baldini', ruolo: 'OPERATORE', ore: 6, contratto: 100, colore: '#d946ef' },
  { nome: 'Roberto', cognome: 'Ceccarelli', ruolo: 'OPERATORE', ore: 8, contratto: 100, colore: '#84cc16' },
] as const;

const CLIENTI = [
  'Torricelli', 'Cummins', 'Siad', 'Sei', 'Heidelberg', 'Bonfiglioli', 'Marchesini Group',
  'IMA', 'Sacmi', 'Coesia', 'Barilla', 'Granarolo', 'Hera', 'Caviro', 'Amadori',
  'Orogel', 'Trevi', 'Cefla', 'Scm Group', 'Biesse',
];

const TIPI_ATTIVITA = [
  { nome: 'Analisi tecnica & RDO', stima: 4, colore: '#0ea5e9', ordine: 1 },
  { nome: 'Quotazione fornitori', stima: 2, colore: '#f59e0b', ordine: 2 },
  { nome: 'Sviluppo offerta', stima: 8, colore: '#16a34a', ordine: 3 },
  { nome: 'Sopralluogo', stima: 8, colore: '#8b5cf6', ordine: 4 },
  { nome: 'Revisione offerta', stima: 4, colore: '#ef4444', ordine: 5 },
];

const TIPI_OFFERTA: ReadonlyArray<{
  nome: string;
  righe: ReadonlyArray<{ tipo: string; ore: number }>;
}> = [
  {
    nome: 'Quadro elettrico BT',
    righe: [
      { tipo: 'Analisi tecnica & RDO', ore: 4 },
      { tipo: 'Sviluppo offerta', ore: 8 },
    ],
  },
  {
    nome: 'MCC - Motor Control Center',
    righe: [
      { tipo: 'Analisi tecnica & RDO', ore: 8 },
      { tipo: 'Quotazione fornitori', ore: 4 },
      { tipo: 'Sviluppo offerta', ore: 16 },
    ],
  },
  {
    nome: 'Quadro di potenza',
    righe: [
      { tipo: 'Analisi tecnica & RDO', ore: 6 },
      { tipo: 'Sviluppo offerta', ore: 12 },
    ],
  },
  {
    nome: 'Revamping impianto',
    righe: [
      { tipo: 'Sopralluogo', ore: 8 },
      { tipo: 'Analisi tecnica & RDO', ore: 8 },
      { tipo: 'Quotazione fornitori', ore: 4 },
      { tipo: 'Sviluppo offerta', ore: 16 },
    ],
  },
  {
    nome: 'Automazione di linea',
    righe: [
      { tipo: 'Analisi tecnica & RDO', ore: 8 },
      { tipo: 'Sviluppo offerta', ore: 20 },
    ],
  },
];

const DESCRIZIONI = [
  'Quadri elettrici BT', 'Quadri elettrici + Quadri elettrici BT', 'MCC linea imbottigliamento',
  'Quadro potenza compressori', 'Revamping cabina MT/BT', 'Automazione linea packaging',
  'Quadri di comando forni', 'Rifacimento quadro generale', 'Quadri bordo macchina',
  'MCC impianto trattamento acque',
];

const COLORI_OFFERTA = [
  '#0d9488', '#16a34a', '#ca8a04', '#8b5cf6', '#dc2626', '#7c3aed',
  '#0ea5e9', '#f59e0b', '#ec4899', '#65a30d',
];

// --------------------------------------------------------------------------

async function svuota(): Promise<void> {
  // L'ordine rispetta le dipendenze di chiave esterna.
  await db.eventoAudit.deleteMany();
  await db.revisione.deleteMany();
  await db.dipendenza.deleteMany();
  await db.attivita.deleteMany();
  await db.offerta.deleteMany();
  await db.indisponibilita.deleteMany();
  await db.templateRigaOfferta.deleteMany();
  await db.tipoOfferta.deleteMany();
  await db.tipoAttivita.deleteMany();
  await db.cliente.deleteMany();
  await db.persona.deleteMany();
}

async function main(): Promise<void> {
  console.warn(`Seed: periodo ${INIZIO_PERIODO} -> ${FINE_PERIODO} (oggi ${OGGI})`);
  await svuota();

  // Persone
  const persone = await Promise.all(
    PERSONE.map((p, i) =>
      db.persona.create({
        data: {
          nome: p.nome,
          cognome: p.cognome,
          email: `${p.nome.toLowerCase()}.${p.cognome.toLowerCase()}@righisolutions.com`,
          ruolo: p.ruolo,
          capacitaOreGiorno: new Prisma.Decimal(p.ore),
          percentualeContratto: p.contratto,
          limiteWip: interoTra(4, 7),
          colore: p.colore,
          attiva: true,
          entraObjectId: `seed-${i}`,
        },
      }),
    ),
  );

  const operatori = persone.filter((p) => p.ruolo === 'OPERATORE' || p.ruolo === 'RESPONSABILE');
  const kam = persone.filter((p) => p.ruolo === 'KAM');

  // Clienti
  const clienti = await Promise.all(
    CLIENTI.map((nome, i) =>
      db.cliente.create({
        data: { ragioneSociale: nome, codiceEsterno: `CLI${String(i + 1).padStart(4, '0')}` },
      }),
    ),
  );

  // Tipi attivita
  const tipiAttivita = await Promise.all(
    TIPI_ATTIVITA.map((t) =>
      db.tipoAttivita.create({
        data: {
          nome: t.nome,
          stimaDefaultOre: new Prisma.Decimal(t.stima),
          colore: t.colore,
          ordine: t.ordine,
        },
      }),
    ),
  );
  const tipoAttivitaPerNome = new Map(tipiAttivita.map((t) => [t.nome, t]));

  // Tipi offerta con template
  const tipiOfferta = await Promise.all(
    TIPI_OFFERTA.map(async (t, indice) => {
      const creato = await db.tipoOfferta.create({ data: { nome: t.nome, ordine: indice } });
      await db.templateRigaOfferta.createMany({
        data: t.righe.map((r, i) => {
          const tipo = tipoAttivitaPerNome.get(r.tipo);
          if (!tipo) throw new Error(`Tipo attivita mancante nel seed: ${r.tipo}`);
          return {
            tipoOffertaId: creato.id,
            tipoAttivitaId: tipo.id,
            ordine: i,
            stimaOre: new Prisma.Decimal(r.ore),
          };
        }),
      });
      return { ...creato, righe: t.righe };
    }),
  );

  // Indisponibilita: chiusura aziendale di agosto, ferie individuali, formazione
  const annoCorrente = Number(OGGI.slice(0, 4));
  const indisponibilitaDati: Array<{
    personaId: string | null;
    dataInizio: DataCivile;
    dataFine: DataCivile;
    tipo: string;
    oreGiorno: number | null;
    descrizione: string;
  }> = [];

  for (const anno of [annoCorrente - 1, annoCorrente, annoCorrente + 1]) {
    indisponibilitaDati.push({
      personaId: null,
      dataInizio: dataCivile(`${anno}-08-10`),
      dataFine: dataCivile(`${anno}-08-21`),
      tipo: 'CHIUSURA_AZIENDALE',
      oreGiorno: null,
      descrizione: 'Chiusura estiva',
    });
    indisponibilitaDati.push({
      personaId: null,
      dataInizio: dataCivile(`${anno}-12-24`),
      dataFine: dataCivile(`${anno}-12-31`),
      tipo: 'CHIUSURA_AZIENDALE',
      oreGiorno: null,
      descrizione: 'Chiusura natalizia',
    });
  }

  for (const persona of persone) {
    // Due periodi di ferie individuali per persona.
    for (let i = 0; i < 2; i += 1) {
      const inizio = aggiungiGiorni(INIZIO_PERIODO, interoTra(0, 300));
      indisponibilitaDati.push({
        personaId: persona.id,
        dataInizio: inizio,
        dataFine: aggiungiGiorni(inizio, interoTra(2, 8)),
        tipo: 'FERIE',
        oreGiorno: null,
        descrizione: 'Ferie',
      });
    }
    /*
     * Carico non-offerta ricorrente per alcuni: risponde alla decisione D10.
     * Non puo assorbire tutta la capacita: una persona a zero ore non e un dato
     * realistico, e il pianificatore giustamente si rifiuta di assegnarle
     * lavoro. Si lascia sempre almeno un'ora al giorno.
     */
    const capacitaNetta = (Number(persona.capacitaOreGiorno) * persona.percentualeContratto) / 100;
    const massimoNonOfferta = Math.floor(capacitaNetta) - 1;
    if (random() < 0.4 && massimoNonOfferta >= 1) {
      indisponibilitaDati.push({
        personaId: persona.id,
        dataInizio: INIZIO_PERIODO,
        dataFine: FINE_PERIODO,
        tipo: 'CARICO_NON_OFFERTA',
        oreGiorno: interoTra(1, Math.min(3, massimoNonOfferta)),
        descrizione: 'Attivita di commessa e assistenza',
      });
    }
  }

  await db.indisponibilita.createMany({
    data: indisponibilitaDati.map((i) => ({
      personaId: i.personaId,
      dataInizio: aDateUtc(i.dataInizio),
      dataFine: aDateUtc(i.dataFine),
      tipo: i.tipo as never,
      oreGiorno: i.oreGiorno === null ? null : new Prisma.Decimal(i.oreGiorno),
      descrizione: i.descrizione,
    })),
  });

  // Calendario costruito sugli stessi dati appena scritti.
  const capacita: PersonaCapacita[] = persone.map((p) => ({
    id: p.id,
    capacitaOreGiorno: Number(p.capacitaOreGiorno),
    percentualeContratto: p.percentualeContratto,
  }));
  const voci: VoceIndisponibilita[] = indisponibilitaDati.map((i) => ({
    personaId: i.personaId,
    dataInizio: i.dataInizio,
    dataFine: i.dataFine,
    oreGiorno: i.oreGiorno,
  }));
  const calendario = new CalendarioLavorativo(capacita, voci);

  /*
   * Volume: con 9-10 operatori e circa 7 ore utili al giorno la capacita annua
   * e nell'ordine delle 14.000 ore. A circa 25 ore per offerta, 520 offerte
   * portano la saturazione media intorno al 75-85%, cioe la fascia che il piano
   * definisce sana. Con 780 offerte la domanda superava la capacita del 35% e
   * ogni persona risultava sovraccarica: dati di prova che non assomigliano a
   * nessuna divisione reale.
   */
  const NUMERO_OFFERTE = 520;
  const oreAssegnate = new Map<string, number>(operatori.map((o) => [o.id, 0]));
  // Capacita giornaliera netta, gia al netto del carico non-offerta ricorrente.
  const capacitaGiornaliera = new Map<string, number>(
    operatori.map((o) => {
      const lorda = (Number(o.capacitaOreGiorno) * o.percentualeContratto) / 100;
      const nonOfferta = indisponibilitaDati
        .filter((i) => i.personaId === o.id && i.tipo === 'CARICO_NON_OFFERTA')
        .reduce((somma, i) => somma + (i.oreGiorno ?? 0), 0);
      return [o.id, Math.max(0.5, lorda - nonOfferta)];
    }),
  );

  /**
   * Sceglie fra tre operatori a caso il meno carico IN RAPPORTO ALLA SUA
   * CAPACITA. Bilanciare sulle ore assolute e sbagliato: chi ha un'ora al
   * giorno risulta sempre il meno carico e finisce all'800%.
   */
  function scegliOperatore(): (typeof operatori)[number] {
    const saturazione = (id: string): number =>
      (oreAssegnate.get(id) ?? 0) / (capacitaGiornaliera.get(id) ?? 1);
    let migliore = scegli(operatori);
    for (let tentativo = 0; tentativo < 2; tentativo += 1) {
      const sfidante = scegli(operatori);
      if (saturazione(sfidante.id) < saturazione(migliore.id)) migliore = sfidante;
    }
    return migliore;
  }
  let createOfferte = 0;
  let createAttivita = 0;
  let saltate = 0;

  for (let i = 0; i < NUMERO_OFFERTE; i += 1) {
    const tipo = scegli(tipiOfferta);
    const cliente = scegli(clienti);
    const referente = scegli(kam);
    const dataRichiesta = aggiungiGiorni(INIZIO_PERIODO, interoTra(0, 320));
    const scadenza = aggiungiGiorni(dataRichiesta, interoTra(5, 35));

    const attivitaDaCreare: Array<{
      tipoAttivitaId: string;
      personaId: string;
      stimaOre: number;
      dataInizio: DataCivile;
      dataFine: DataCivile;
      ordine: number;
    }> = [];

    // Il 12% delle offerte resta in coda "Da assegnare": e il caso d'uso M5.
    const daAssegnare = random() < 0.12;
    let cursore = aggiungiGiorni(dataRichiesta, interoTra(0, 3));
    let pianificabile = true;

    if (!daAssegnare) {
      for (const [indice, riga] of tipo.righe.entries()) {
        const tipoAtt = tipoAttivitaPerNome.get(riga.tipo);
        if (!tipoAtt) throw new Error(`Tipo attivita mancante: ${riga.tipo}`);
        const persona = scegliOperatore();
        const ore = riga.ore * (0.75 + random() * 0.7); // variabilita realistica
        try {
          const p = calendario.espandiDurata(persona.id, cursore, Math.round(ore * 2) / 2);
          attivitaDaCreare.push({
            tipoAttivitaId: tipoAtt.id,
            personaId: persona.id,
            stimaOre: Math.round(ore * 2) / 2,
            dataInizio: p.dataInizio,
            dataFine: p.dataFine,
            ordine: indice,
          });
          oreAssegnate.set(
            persona.id,
            (oreAssegnate.get(persona.id) ?? 0) + Math.round(ore * 2) / 2,
          );
          cursore = aggiungiGiorni(p.dataFine, 1);
        } catch {
          pianificabile = false;
          break;
        }
      }
    }

    if (!pianificabile) {
      saltate += 1;
      continue;
    }

    const ultima = attivitaDaCreare[attivitaDaCreare.length - 1];
    const stato = determinaStato(daAssegnare, ultima?.dataFine ?? null);

    const offerta = await db.offerta.create({
      data: {
        codice: `OF${String(i + 1).padStart(5, '0')}`,
        descrizione: scegli(DESCRIZIONI),
        clienteId: cliente.id,
        kamId: referente.id,
        tipoOffertaId: tipo.id,
        valoreStimato: new Prisma.Decimal(interoTra(3, 350) * 1000),
        dataRichiesta: aDateUtc(dataRichiesta),
        dataScadenzaCliente: aDateUtc(scadenza),
        priorita: random() < 0.15 ? 'ALTA' : random() < 0.05 ? 'URGENTE' : 'NORMALE',
        stato,
        colore: scegli(COLORI_OFFERTA),
      },
    });
    createOfferte += 1;

    if (daAssegnare) {
      // Attivita in coda: nessuna persona, nessuna data.
      const riga = tipo.righe[0];
      if (riga) {
        const tipoAtt = tipoAttivitaPerNome.get(riga.tipo);
        if (tipoAtt) {
          await db.attivita.create({
            data: {
              offertaId: offerta.id,
              tipoAttivitaId: tipoAtt.id,
              stimaOre: new Prisma.Decimal(riga.ore),
              ordine: 0,
            },
          });
          createAttivita += 1;
        }
      }
      continue;
    }

    const creati = [];
    for (const a of attivitaDaCreare) {
      const statoAttivita = determinaStatoAttivita(a.dataInizio, a.dataFine);
      const creato = await db.attivita.create({
        data: {
          offertaId: offerta.id,
          tipoAttivitaId: a.tipoAttivitaId,
          personaId: a.personaId,
          stimaOre: new Prisma.Decimal(a.stimaOre),
          consuntivoOre:
            statoAttivita === 'COMPLETATA'
              ? new Prisma.Decimal(Math.round(a.stimaOre * (0.7 + random() * 0.8) * 2) / 2)
              : null,
          dataInizio: aDateUtc(a.dataInizio),
          dataFine: aDateUtc(a.dataFine),
          stato: statoAttivita,
          causaleBlocco: statoAttivita === 'BLOCCATA' ? scegli([
            'ATTESA_DATO_CLIENTE',
            'ATTESA_QUOTAZIONE_FORNITORE',
            'ATTESA_SPECIFICA_TECNICA',
          ] as const) : null,
          iniziataIl:
            statoAttivita === 'NON_INIZIATA' ? null : aDateUtc(a.dataInizio),
          completataIl: statoAttivita === 'COMPLETATA' ? aDateUtc(a.dataFine) : null,
          ordine: a.ordine,
        },
      });
      creati.push(creato);
      createAttivita += 1;
    }

    // Dipendenze Fine-Inizio fra attivita consecutive della stessa offerta.
    for (let k = 1; k < creati.length; k += 1) {
      const predecessore = creati[k - 1];
      const successore = creati[k];
      if (!predecessore || !successore) continue;
      await db.dipendenza.create({
        data: { predecessoreId: predecessore.id, successoreId: successore.id },
      });
    }
  }

  const oreTotali = [...oreAssegnate.values()].reduce((a, b) => a + b, 0);
  const capacitaTotale = operatori.reduce(
    (somma, o) =>
      somma +
      ((Number(o.capacitaOreGiorno) * o.percentualeContratto) / 100) *
        // Giorni lavorativi approssimati nel periodo simulato.
        Math.round(differenzaGiorni(FINE_PERIODO, INIZIO_PERIODO) * (5 / 7)),
    0,
  );

  const conteggi = {
    persone: await db.persona.count(),
    clienti: await db.cliente.count(),
    offerte: createOfferte,
    attivita: createAttivita,
    dipendenze: await db.dipendenza.count(),
    indisponibilita: await db.indisponibilita.count(),
    saltatePerCalendario: saltate,
    saturazioneMediaPercento:
      capacitaTotale === 0 ? null : Math.round((oreTotali / capacitaTotale) * 100),
  };
  console.warn('Seed completato:', conteggi);
}

type StatoOffertaSeed =
  | 'DA_PIANIFICARE'
  | 'PIANIFICATA'
  | 'IN_LAVORAZIONE'
  | 'CONSEGNATA'
  | 'IN_REVISIONE';

function determinaStato(daAssegnare: boolean, dataFine: DataCivile | null): StatoOffertaSeed {
  if (daAssegnare) return 'DA_PIANIFICARE';
  if (dataFine === null) return 'PIANIFICATA';
  if (dataFine < OGGI) return random() < 0.85 ? 'CONSEGNATA' : 'IN_REVISIONE';
  if (dataFine >= OGGI && random() < 0.6) return 'IN_LAVORAZIONE';
  return 'PIANIFICATA';
}

function determinaStatoAttivita(inizio: DataCivile, fine: DataCivile): 'NON_INIZIATA' | 'IN_CORSO' | 'BLOCCATA' | 'COMPLETATA' {
  if (fine < OGGI) {
    /*
     * Una piccola quota resta indietro: sono le righe "In ritardo" del beta.
     * Solo fra le attivita finite di recente, pero: una attivita "in corso" da
     * sei mesi non e un ritardo, e un dato dimenticato, e falsava l'anzianita
     * del lavoro in corso nella dashboard.
     */
    const recente = differenzaGiorni(OGGI, fine) <= 30;
    if (!recente) return 'COMPLETATA';
    return random() < 0.8 ? 'COMPLETATA' : random() < 0.5 ? 'IN_CORSO' : 'BLOCCATA';
  }
  if (inizio <= OGGI) return random() < 0.8 ? 'IN_CORSO' : 'BLOCCATA';
  return 'NON_INIZIATA';
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (errore: unknown) => {
    console.error('Seed fallito:', errore);
    await db.$disconnect();
    process.exit(1);
  });
