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

Test unitari: 157 su 9 file. Typecheck, lint e build puliti. Verifica end-to-end: nessun problema.

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

## Cosa manca

| Ambito | Nota |
|---|---|
| Autenticazione Entra ID e ruoli | Dipende da D5. L'audit registra gia un campo utente, oggi nullo |
| Dashboard a quattro riquadri (S1) | E' il Taglio 3 |
| Revisioni offerta (S2) | Taglio 3. Senza, il lead time misurato resta parziale |
| Notifiche Teams e Outlook (S3) | Taglio 3 |
| Consuntivo ore (S4) | Taglio 3. E' la funzione piu esposta all'art. 4: va rilasciata con l'informativa |
| Limiti WIP in timeline (S5) | Il limite e configurabile e confrontato in Impostazioni, non ancora segnalato sulla timeline |
| Virtualizzazione verticale | Non ancora necessaria: la vista per risorsa ha 12 righe, le altre sono limitate a 40 gruppi |
| Modifica dei template dei tipi di offerta | Scelta consapevole, par. 15.2.7 |

## Prossimo passo consigliato

Il Taglio 2 del piano e di fatto assorbito nel Taglio 1: capacita, coda e
dipendenze sono gia in esercizio. Il passo utile ora e il Taglio 3, e dentro
quello il riquadro "A rischio" della dashboard, che e l'unica risposta alla
domanda "cosa salta" senza scorrere la timeline.

Prima pero servono i numeri reali di D8, D9 e D10: senza, la heatmap e
plausibile ma non vera, ed e su di essa che il responsabile prenderebbe
decisioni.
