# Portale Pianificazione Offerte

Pianificazione e carico della divisione offerte commerciali di Righi Solutions.

Analisi, scelte e roadmap: `docs/00-analisi-e-piano.md`.
Stato di avanzamento rispetto al piano: `docs/01-stato-avanzamento.md`.

## Requisiti

- Node 22 o superiore
- PostgreSQL 16 o superiore

## Avvio in locale

```bash
npm install
cp .env.example .env        # poi correggere DATABASE_URL
npm run db:push             # crea lo schema
npm run db:seed             # dati di prova a volume realistico
npm run dev
```

L'applicazione risponde su:

- http://localhost:3000/pianificazione - timeline, carico e coda
- http://localhost:3000/dashboard - indicatori direzionali
- http://localhost:3000/impostazioni - capacita, calendario, stime

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo |
| `npm run build` | Compilazione di produzione |
| `npm run start` | Server di produzione |
| `npm run check` | Typecheck, lint e test unitari: il cancello da superare prima di ogni commit |
| `npm run test` | Solo test unitari |
| `npm run verifica:ui` | Verifica end-to-end su un server gia avviato, con misura dei tempi |
| `npm run db:push` | Applica lo schema al database |
| `npm run db:seed` | Rigenera i dati di prova |
| `npm run db:studio` | Ispezione del database |

La verifica end-to-end SCRIVE sul database: crea una richiesta di offerta, la
assegna, sposta una barra. Va eseguita solo su un database di sviluppo. Per
tornare a uno stato noto: `npm run db:seed`.

## Come e fatto

```
prisma/schema.prisma        Modello dati
prisma/seed.ts              Dati di prova a volume realistico (780 offerte, ~1900 attivita)
src/lib/data/               Date civili senza ora e formattazione italiana
src/lib/calendario/         Festivita italiane, capacita netta, espansione durata
src/lib/capacita/           Allocazione per persona e giorno, fasce di carico
src/lib/timeline/           Impilamento in corsie e geometria delle barre
src/lib/offerta/            Stato derivato, margine sulla scadenza, semaforo
src/lib/vista/              Zoom, raggruppamenti, costruzione delle righe
src/lib/query/              Caricamento della finestra di pianificazione
src/components/             Interfaccia
src/app/                    Rotte e API
scripts/verifica-ui.mjs     Verifica end-to-end con soglie prestazionali
```

La logica di dominio sta tutta in funzioni pure sotto `src/lib`, senza dipendenze
da React o da Prisma, ed e coperta da test. I componenti non contengono calcoli:
se un calcolo serve, va in `src/lib` con il suo test.

## Regole non negoziabili

Derivano dai capitoli 5.4 e 14 del piano.

1. Le date di pianificazione sono date civili `YYYY-MM-DD`, mai `Date` con ora.
   Nessun uso di `new Date()` nel codice di calcolo: si passa per `dataCivile`.
2. La durata di una attivita e in ore di lavoro. Le date si ricavano espandendo
   le ore sui giorni lavorativi della persona assegnata.
3. "In ritardo" non e uno stato memorizzato: si calcola.
4. Nessuna percentuale di completamento manuale.
5. Ogni causale e a scelta chiusa, mai testo libero nei flussi quotidiani.
6. Le modifiche concorrenti passano dal controllo di versione ottimistico.
   Un conflitto si segnala, non si sovrascrive.
7. Una funzione vuota e un errore di lint, non una svista.
8. Le date non arrivano mai dal client: il client dichiara l'intenzione (chi, da
   quando), il server calcola con il calendario reale.
9. Nessuna collocazione silenziosa: se una risorsa non ha capacita entro 45
   giorni dalla data richiesta, l'operazione viene rifiutata con il motivo.
10. Un colore di stato non porta mai il significato da solo: accanto c'e sempre
    un numero o un'etichetta, e per il carico esiste una vista tabellare.

## Soglie prestazionali

Verificate da `npm run verifica:ui` (par. 7.3 del piano).

| Metrica | Soglia | Ultimo esito |
|---|---|---|
| Primo caricamento utile | sotto 1500 ms | circa 1150 ms |
| Cambio filtro o raggruppamento | sotto 150 ms | circa 50 ms |
| Barre visibili raggiungibili al click | 100% | 91 su 91 |
| Carico massimo mostrato sui dati di prova | sotto 500% | 259% |

## Conformita

Il portale tratta dati sulla prestazione lavorativa di persone identificate.
Prima del rilascio in esercizio vanno prodotti informativa e regolamento interno
secondo l'art. 4 dello Statuto dei Lavoratori e la disciplina privacy: si veda
il par. 14.1 del piano. Non e un adempimento successivo.
