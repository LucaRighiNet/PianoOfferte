# Stato di avanzamento

Riferimento: `docs/00-analisi-e-piano.md`. Aggiornato al 17 settembre 2026.

## Cosa e fatto e verificato

| ID piano | Funzione | Stato | Come e verificato |
|---|---|---|---|
| — | Impianto progetto: Next 15, TypeScript strict, Prisma, PostgreSQL, Vitest | Fatto | `npm run check` e `npm run build` |
| — | Lint che tratta una funzione vuota come errore | Fatto | `@typescript-eslint/no-empty-function: error` |
| — | Modello dati completo secondo i cap. 6 e 14 | Fatto | Schema applicato, seed funzionante |
| 14.6 | Dati di prova a volume realistico: 780 offerte, 1883 attivita, 12 persone | Fatto | `npm run db:seed` |
| 14.7 | Date civili senza ora, immuni a fuso e ora legale, settimane ISO | Fatto | 21 test, inclusi i cambi di ora legale 2026 |
| 14.4 | Durata in ore espansa sui giorni lavorativi, con ferie e chiusure | Fatto | 30 test, incluso lo scavalco di una settimana di ferie |
| M1 | Stima ore con preset per tipo attivita | Fatto (dati) | Template per tipo offerta nel seed |
| M2 | Vista per risorsa con impilamento corsie e heatmap di capacita | Fatto | 13 test sull'impilamento, ottimale su 200 insiemi casuali |
| M2 | Fasce di carico e saturazione | Fatto | 19 test |
| M3 | Scadenza cliente, margine in giorni lavorativi, semaforo | Fatto | 22 test; visibile su barra e dettaglio |
| M5 | Coda "Da assegnare" | Fatto (lettura) | Pannello laterale, 104 voci nel seed |
| M6 | Stato "Bloccata" con causale a scelta chiusa | Fatto | Validato anche lato API |
| M7 | Avanzamento a un click, con tasti rapidi 1-4 | Fatto | Verifica end-to-end |
| S6 | Viste per offerta, cliente, KAM con protezione di volume | Fatto | Banner oltre 40 gruppi |
| 14.2 | Controllo di concorrenza ottimistico | Fatto | 409 con stato attuale, rollback lato client |
| 14.3 | Stato "In ritardo" derivato, mai memorizzato | Fatto | 22 test |
| 14.8 | Autosave con tre stati espliciti e rollback visibile | Fatto | Indicatore Salvato / In corso / Non salvato |
| 2.3 | Tema chiaro e scuro con token | Fatto | Verifica end-to-end |
| 7.3 | Soglie prestazionali misurate | Fatto | `npm run verifica:ui` |
| — | Legenda dei colori | Fatto | Aggiunta dopo revisione visiva |

Test unitari: 146. Typecheck, lint e build puliti.

## Decisioni di progetto prese durante lo sviluppo

1. Il colore delle barre codifica il TIPO di attivita, non l'identita
   dell'offerta. Con 30-100 offerte al mese un colore per offerta produce
   decine di tinte simultanee non decodificabili. L'identita dell'offerta resta
   in un filetto laterale, nel tooltip e nel dettaglio.
2. La heatmap di capacita vive in una traccia incassata con tratteggio per i
   giorni chiusi: senza contrasto un giorno libero e un giorno chiuso si
   leggevano uguali.
3. Le viste diverse da "per risorsa" si fermano a 40 gruppi con un avviso, come
   previsto dal par. 1.2: con 485 gruppi la vista non e utilizzabile.
4. La saturazione considera tutto il lavoro pianificato, non solo quello
   filtrato: nascondere meta del carico renderebbe la heatmap una bugia.

## Difetti trovati e corretti in corso d'opera

| Difetto | Come e stato trovato | Correzione |
|---|---|---|
| Barre della stessa corsia non cliccabili: il contenitore a tutta riga copriva quelle precedenti | Verifica end-to-end | Rimosso il contenitore, posizione verticale passata alla barra |
| Test sul calendario che perdeva 2 ore su 12 in presenza di assenza parziale | Esecuzione test | Corretta l'aspettativa: il codice era giusto |
| Tratteggio dei giorni non lavorativi sfalsato di 1 px | Revisione del codice | Scostamento della barra sottratto esplicitamente |
| Dichiarazione CSS malformata nei token del tema scuro | Rilettura | Rimossa |
| Prova di raggiungibilita che segnalava come coperte barre semplicemente fuori viewport | Analisi del falso positivo | Il controllo esamina solo le barre dentro l'area visibile |
| Fallimento di idratazione mascherato da "il dettaglio non compare" | Analisi della causa | Lo script rileva le risorse non caricate e prova l'interattivita in modo diretto |

## Cosa manca del Taglio 1

| ID | Funzione | Nota |
|---|---|---|
| M8 | Inserimento RDO sotto i 30 secondi con template | I dati e i template esistono, manca il form |
| M5 | Assegnazione per trascinamento dalla coda alla timeline | La coda mostra, non assegna |
| M2 | Trascinamento e ridimensionamento delle barre | La timeline e in sola lettura salvo il cambio di stato |
| M4 | Gestione delle indisponibilita da interfaccia | I dati esistono, manca la schermata Impostazioni |
| M9 | Ricalcolo della catena di dipendenze | Le dipendenze sono nel modello, non sono ancora disegnate |
| — | Autenticazione Entra ID e ruoli | Dipende dalla decisione aperta D5 |
| — | Virtualizzazione verticale | Non ancora necessaria: la vista per risorsa ha 12 righe |

## Decisioni aperte che bloccano il seguito

D4 (chi carica la RDO), D5 (Entra ID disponibile), D6 (dove ospitare),
D8 (tipi di offerta reali e loro attivita standard), D9 (ore reali dedicate
alle offerte), D10 (carico non-offerta). Si veda il cap. 12 del piano.

D9 e D10 sono gia rappresentabili nel modello: la capacita e "ore al giorno
dedicate alle offerte", non l'orario contrattuale, ed esiste il tipo di
indisponibilita `CARICO_NON_OFFERTA` per sottrarre ore dedicate a commesse e
assistenza. Servono i numeri reali.
