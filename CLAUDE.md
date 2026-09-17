# Portale Pianificazione Offerte - contesto per chi sviluppa

Applicativo di pianificazione delle offerte commerciali di Righi Solutions.
Prima di modificarlo, leggere `docs/00-analisi-e-piano.md`: contiene l'analisi,
le decisioni prese e soprattutto le esclusioni volute (par. 5.4), che non vanno
reintrodotte per iniziativa.

## Comandi

| Comando | Quando |
|---|---|
| `npm run check` | Prima di ogni commit: typecheck, lint, test unitari |
| `npm run verifica:ui` | Dopo ogni modifica all'interfaccia, su un server gia avviato |
| `npm run db:deploy` | Applica le migrazioni |
| `npm run db:seed` | Rigenera i dati di prova a volume realistico |

Il server di sviluppo richiede PostgreSQL attivo. Se le pagine danno 500,
controllare per prima cosa che il database risponda: `pg_isready`.

## Regole non negoziabili

Discendono dal piano e da difetti gia pagati. Violarle rompe cose che oggi
funzionano.

1. Le date di pianificazione sono date civili `YYYY-MM-DD`, tipo `DataCivile`.
   Mai `Date` con orario nel codice di calcolo, mai `new Date()` fuori dai
   confini con database e orologio.
2. La durata e in ore di lavoro. Le date si ricavano espandendo le ore sui
   giorni lavorativi della persona: `CalendarioLavorativo.espandiDurata`.
3. Le date non arrivano mai dal client. Il client dichiara l'intenzione (chi,
   da quando), il server calcola.
4. "In ritardo" non e uno stato memorizzato: si calcola.
5. Nessuna percentuale di completamento manuale.
6. Ogni causale e a scelta chiusa, mai testo libero nei flussi quotidiani.
7. Il colore della barra codifica il TIPO di attivita; il TESTO porta cliente e
   descrizione dell'offerta. Non invertirli: il tipo e gia nel colore.
8. Le restrizioni di visibilita si applicano al confine dei dati, in
   `src/lib/query`, non nell'interfaccia.
9. Il ruolo viene dal database, mai dai claim dell'identita.
10. Il consuntivo ore lo registra solo chi ha svolto il lavoro. Nemmeno il
    responsabile per conto suo: e la regola che tiene la funzione dentro il
    perimetro dell'art. 4 dello Statuto dei Lavoratori.
11. Un colore di stato non porta mai il significato da solo: accanto c'e sempre
    un numero o un'etichetta.
12. Una funzione vuota e un errore di lint, non una svista.
13. Cio che si ripete su ogni elemento sta in una classe, non in un attributo
    `style`. Con centinaia di barre e migliaia di celle, una stringa di stile
    ripetuta pesa piu del disegno che descrive. In linea restano solo posizione,
    dimensione e colore variabile.
14. Le dipendenze formano una unione di cammini semplici, imposta dallo schema:
    al massimo un successore e un predecessore per attivita. Il codice percorre
    una catena, non un grafo. Se un giorno servisse un grafo aciclico servono
    ordinamento topologico e cammino critico, ed e una decisione di prodotto da
    prendere, non una modifica da fare di passaggio.

## Come e organizzato

```
src/lib/data/          Date civili e formattazione italiana
src/lib/calendario/    Festivita, capacita netta, espansione durata
src/lib/capacita/      Allocazione per persona e giorno, fasce di carico
src/lib/pianificazione/ Riprogrammazione della catena di dipendenze
src/lib/timeline/      Impilamento in corsie, geometria delle barre
src/lib/offerta/       Stato derivato, margine, semaforo
src/lib/metriche/      Indicatori della dashboard
src/lib/auth/          Identita, ruoli, permessi
src/lib/notifiche/     Contenuto e spedizione dei digest
src/lib/vista/         Zoom, raggruppamenti, costruzione delle righe
src/lib/query/         Caricamento dei dati per le pagine
src/lib/server/        Servizi che scrivono: pianificazione, offerte, revisioni
src/components/        Interfaccia
src/app/               Rotte e API
```

La logica di dominio sta in funzioni pure sotto `src/lib`, senza dipendenze da
React o Prisma, ed e coperta da test. I componenti non contengono calcoli: se
serve un calcolo, va in `src/lib` con il suo test.

## Difetti gia pagati, da non ripetere

- Un contenitore a tutta riga sopra le barre le rende non cliccabili.
- Bilanciare un carico sulle ore assolute invece che sul rapporto con la
  capacita porta chi ha poche ore al 800%.
- Filtrando le persone per visibilita, il calendario lato client non conosce
  piu gli assegnatari altrui: usare `conoscePersona` e degradare, non
  trasmettere i dati di tutti.
- Fare una sostituzione nel sorgente senza verificare che si applichi produce
  modifiche silenziosamente mancanti.
- Dopo una modifica all'interfaccia si esegue `verifica:ui`, non uno screenshot:
  gli scatti non distinguono un bug da un database fermo.
- Un'invariante assunta dal codice e non imposta dallo schema prima o poi viene
  violata, e il codice fallisce in silenzio. Se il codice assume qualcosa sulla
  forma dei dati, lo deve garantire il database.
- Ottimizzare senza misurare e tirare a indovinare. La griglia dei giorni
  sembrava il costo principale e valeva il 14%; il vero peso erano gli attributi
  di stile ripetuti e la finestra di dati caricata. Il database, sospettato per
  primo, esegue in un millesimo e mezzo.
- Una griglia regolare non ha bisogno di un elemento per colonna: e uno sfondo.
- Due misure singole prese in momenti diversi non sono un confronto. Il primo
  caricamento varia del 15% fra un giro e l'altro sulla stessa compilazione:
  confrontando un giro prima con un giro dopo si e riportato un guadagno che non
  esisteva. Per concludere su un tempo servono la mediana di piu giri e le due
  compilazioni avviate una dopo l'altra sulla stessa macchina. I pesi in byte,
  invece, sono deterministici e bastano da soli.
- Una riduzione di peso non e una riduzione di tempo su `localhost`, dove il
  trasferimento e quasi gratis. Si dichiara il byte risparmiato, e il tempo solo
  dove si e misurato.
- `verifica:ui` va eseguito su una compilazione di produzione, non su
  `npm run dev`. In sviluppo le rotte si compilano alla prima chiamata e ci
  mettono secondi: le attese fisse dello script scadono e segnala guasti che non
  esistono.
