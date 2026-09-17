# Stato di avanzamento

Riferimento: `docs/00-analisi-e-piano.md`. Aggiornato al 17 settembre 2026.

## Taglio 1: completato nelle sue funzioni previste

| ID piano | Funzione | Stato | Verifica |
|---|---|---|---|
| M1 | Stima ore con preset per tipo attivita | Fatto | Template applicati alla creazione; stime modificabili in Impostazioni |
| M2 | Vista per risorsa con impilamento e heatmap di capacita | Fatto | 13 test sull'impilamento, ottimale su 200 insiemi casuali |
| M2 | Spostamento e ridimensionamento delle barre | Fatto | Verifica end-to-end: trascinamento con conferma di salvataggio |
| M3 | Scadenza cliente, margine in giorni lavorativi, semaforo | Fatto | 22 test; visibile su barra, coda e dettaglio |
| M4 | Calendario indisponibilita gestibile da interfaccia | Fatto | Impostazioni: inserimento ed eliminazione verificati |
| M5 | Coda "Da assegnare" con assegnazione per trascinamento | Fatto | Verifica end-to-end: la coda cala dopo il rilascio |
| M6 | Stato "Bloccata" con causale a scelta chiusa | Fatto | Validato anche lato API |
| M7 | Avanzamento a un click, tasti rapidi 1-4 | Fatto | Verifica end-to-end |
| M8 | Inserimento RDO sotto i 30 secondi con template | Fatto | Cinque campi, tre precompilati, anteprima delle attivita generate |
| M9 | Ricalcolo della catena di dipendenze e disegno dei collegamenti | Fatto | 11 test sulla riprogrammazione |
| S6 | Viste per offerta, cliente, KAM con protezione di volume | Fatto | Avviso oltre 40 gruppi |
| 14.2 | Controllo di concorrenza ottimistico | Fatto | 409 con stato attuale, rollback lato client |
| 14.3 | Stato "In ritardo" derivato | Fatto | 22 test |
| 14.4 | Durata in ore espansa sui giorni lavorativi | Fatto | 30 test |
| 14.6 | Dati di prova a volume realistico | Fatto | 780 offerte, 1883 attivita, 1103 dipendenze |
| 14.7 | Date civili immuni a fuso e ora legale | Fatto | 21 test |
| 14.8 | Autosave con tre stati e rollback visibile | Fatto | Indicatore Salvato / In corso / Non salvato |
| S1 | Dashboard direzionale a quattro riquadri | Fatto | 25 test sulle metriche; verifica end-to-end su indicatori, griglia e vista tabellare |
| S5 | Limite WIP con evidenza di superamento | Fatto | Visibile in dashboard e in Impostazioni |
| 8.3 | Annulla delle ultime azioni di pianificazione, con Ctrl+Z | Fatto | Verifica end-to-end; pila di dieci azioni, ognuna con il proprio controllo di concorrenza |
| S5 | Limite WIP segnalato sulla corsia della persona | Fatto | 4 test; conteggio sul lavoro totale, non su quello filtrato |
| 15.2.14 | Cliente e descrizione dell'offerta leggibili sulla barra | Fatto | Etichetta dentro o fuori la barra secondo lo spazio |
| D5 | Autenticazione: identita dalla piattaforma Entra ID o pagina di accesso in sviluppo | Fatto | 12 test sul parser delle intestazioni; verifica end-to-end sul rimando all'accesso |
| 14.1 | Permessi per ruolo applicati al confine dei dati | Fatto | 20 test; verifica end-to-end che un operatore non veda Nuova RDO, Impostazioni ne il carico dei colleghi |
| S4 | Consuntivo ore, registrabile solo da chi ha svolto il lavoro | Fatto | Regola nei permessi e nell'API; bozza di informativa in docs/02 |
| S3 | Notifiche: digest giornaliero su registro o Microsoft Graph | Fatto | 25 test su contenuto e configurazione; endpoint provato con e senza chiave |
| — | Migrazioni versionate, applicate con db:deploy | Fatto | Provate da database vuoto, con seed sopra |
| — | Integrazione continua: lo stesso cancello, eseguito dalla macchina | Fatto | Flusso con PostgreSQL reale e schermate conservate sui fallimenti |
| — | Revisione di sicurezza di autenticazione, segreti e rotte | Fatto | Esito in docs/03-esercizio.md par. 3-bis; due difetti trovati e chiusi |
| S2 | Revisioni offerta | Fatto | Nuova attivita agganciata all'ultima, stessa persona, offerta riportata in revisione; quota di revisioni in dashboard |

Test unitari: 253 su 14 file. Typecheck, lint e build puliti. Verifica end-to-end: nessun problema.

## Soglie prestazionali, ultima misura

| Metrica | Soglia | Esito |
|---|---|---|
| Primo caricamento utile | sotto 1500 ms | circa 1230-1480 ms |
| Cambio filtro o raggruppamento | sotto 150 ms | circa 50 ms |
| Barre visibili raggiungibili al click | 100% | 101 su 101 |

Il caricamento e vicino alla soglia: con 900 attivita nella finestra il margine
si e ridotto. E' il primo indicatore da sorvegliare quando il volume crescera.

## Difetti trovati e corretti

| Difetto | Come e stato trovato | Correzione |
|---|---|---|
| Barre della stessa corsia non cliccabili: il contenitore a tutta riga copriva le precedenti | Verifica end-to-end | Rimosso il contenitore |
| Test sul calendario che perdeva 2 ore su 12 con assenza parziale | Esecuzione test | Corretta l'aspettativa: il codice era giusto |
| Tratteggio dei giorni non lavorativi sfalsato di 1 px | Revisione del codice | Scostamento sottratto esplicitamente |
| Dichiarazione CSS malformata nei token del tema scuro | Rilettura | Rimossa |
| Colore per offerta illeggibile a volume | Ispezione del rendering | Il colore codifica il tipo di attivita; l'offerta resta nel filetto |
| Striscia di capacita indistinguibile da una riga di barre | Ispezione del rendering | Traccia incassata con tratteggio sui giorni chiusi |
| Fallimento di idratazione mascherato da "il dettaglio non compare" | Analisi della causa | Lo script rileva le risorse non caricate e prova l'interattivita in modo diretto |
| Logica di riprogrammazione duplicata in due percorsi | Rilettura prima dei test | Riscritta con una sola implementazione |
| Stima del ridimensionamento calcolata con 8 ore fisse | Revisione del codice | Il client invia la data di fine, il server ricava le ore dal calendario reale |
| Lo script di verifica lasciava righe residue in banca dati | Ispezione dello screenshot di Impostazioni | La voce di prova porta una nota irripetibile e viene eliminata per quella |
| Campi di testo senza `type` esplicito, non selezionabili dai test | Fallimento della verifica | `type="text"` esplicito |
| Lavoro collocato dieci mesi avanti, in silenzio, per una risorsa senza capacita netta | Dashboard: margini di -297 giorni sui dati di prova | Guardia sullo scostamento massimo, con tre test. Il motore era corretto: sbagliato era il prodotto |
| Dati di prova con domanda superiore del 35% alla capacita: ogni persona sovraccarica | Ispezione della dashboard | Volume portato a 520 offerte, saturazione media 88% |
| Il bilanciamento del seed distribuiva per ore assolute, non in rapporto alla capacita | Zoli Chiara all'827% | Bilanciamento sulla saturazione, non sulle ore |
| Carico non-offerta che azzerava la capacita di una persona | Analisi della causa dello slittamento | Il seed lascia sempre almeno un'ora al giorno |
| Due `void` per zittire variabili inutilizzate | Rilettura | Import e variabile rimossi |
| Il testo della barra ripeteva il tipo di attivita, gia codificato dal colore, e l'identita dell'offerta spariva | Segnalazione del committente | Il testo porta cliente e descrizione; il tipo resta nel tooltip |
| Una pila di annullamento che leggeva lo stato dentro un aggiornatore di React | Rilettura prima dell'uso | Chi annulla legge la cima della pila e poi la rimuove |
| Filtrando le persone per visibilita, il calendario lato client non conosceva piu gli assegnatari altrui e sollevava eccezione | Verifica end-to-end sul ruolo operatore | Il calendario dichiara chi conosce, il chiamante degrada; nessun dato altrui viene trasmesso per aggirare il problema |
| Nel digest le ore venivano prese con un indice dell'array non filtrato, quindi dall'attivita sbagliata | Rilettura prima dei test | Le ore viaggiano insieme all'attivita |
| Una funzione di permesso che ritornava sempre vero | Rilettura | Rimossa: non esisteva una regola dietro |
| Il pulsante Nuova RDO restava visibile a un operatore perche una mia sostituzione nel sorgente era andata a vuoto in silenzio | Verifica end-to-end sui ruoli | Rifatta con controllo che si applichi |
| Contatori del digest che mescolavano messaggi e persone | Lettura dell'esito | Separati: chi pianifica riceve due messaggi |
| Il README imponeva migrazioni versionate, ma lo schema era sempre stato applicato con db push | Rilettura delle regole che avevo scritto | Migrazione creata con la procedura di baseline non distruttiva |
| Avevo definito la modalita sviluppo "la meno privilegiata": e falso, lascia scegliere qualunque identita a chiunque | Revisione di sicurezza | In produzione e rifiutata, con messaggio che spiega; si riabilita solo con consenso esplicito |
| Confronto della chiave delle notifiche con uguaglianza semplice | Revisione di sicurezza | Confronto a tempo costante |
| Percorso del browser inchiodato a questo ambiente nello script di verifica | Scrittura della CI | Risolto da Playwright quando il percorso non esiste |
| Lo schema permetteva diramazioni nelle dipendenze che il codice ignorava in silenzio | Domanda del committente sulla teoria dei grafi | Due vincoli di unicita rendono il grafo una unione di cammini semplici. Rifiuto provato dal vivo |
| Due revisioni aperte nello stesso istante collidevano sul vincolo e davano errore interno | Conseguenza del vincolo appena aggiunto | Tradotto in un conflitto di concorrenza spiegato all'utente |

## Cosa manca

| Ambito | Nota |
|---|---|
| Virtualizzazione verticale | Non ancora necessaria: la vista per risorsa ha 12 righe, le altre sono limitate a 40 gruppi |
| Modifica dei template dei tipi di offerta | Scelta consapevole, par. 15.2.7 |

## Cosa resta da fare, e a chi tocca

Il perimetro concordato e coperto. Cio che resta non e codice.

| # | Voce | A chi tocca |
|---|---|---|
| 1 | Numeri reali di D8, D9 e D10: tipi di offerta effettivi, ore davvero dedicate alle offerte, carico non-offerta per persona | Committente |
| 2 | Validare la bozza di informativa art. 4 e renderla nota prima dell'avvio | Consulente del lavoro e responsabile protezione dati |
| 3 | Scegliere dove ospitare e configurare `MODALITA_AUTENTICAZIONE=easyauth` con Entra ID davanti. Il portale NON va esposto senza quel fronte: vedi docs/03-esercizio.md par. 3 | IT |
| 4 | Credenziali Microsoft Graph e scheduler giornaliero per il digest | IT |
| 5 | Due settimane di affiancamento dopo il rilascio, con cronometro sull'inserimento RDO e sull'assegnazione | Committente |
| 6 | Spostare il ramo predefinito del repository su `main` (un clic nelle impostazioni GitHub) | Committente |

Il primo punto e il piu importante di tutti. Oggi la dashboard dice 88% di
saturazione media e 78% di consegne in tempo: cifre coerenti e credibili,
calcolate su capacita che ha inventato chi ha scritto i dati di prova. Il
responsabile di divisione prenderebbe decisioni su di esse.

Tutto il resto dello strumento e pronto a riceverli: la capacita e gia "ore
dedicate alle offerte" e non orario contrattuale, il carico non-offerta ha gia
la sua voce, i tipi di offerta hanno gia i template. Servono i valori veri.

## Idee scartate, e perche

Non tutto cio che si poteva aggiungere andava aggiunto. Restano fuori per
scelta, non per dimenticanza: percentuale di completamento manuale, timesheet
completo, gestione documentale dell'offerta, configuratore prezzi, dipendenze
diverse da Fine-Inizio, livellamento automatico delle risorse, chat interna,
avanzamento della commessa dopo la consegna. Il motivo di ciascuna e nel
par. 5.4 del piano.
