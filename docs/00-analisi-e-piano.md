# Portale Pianificazione Offerte - Analisi e Piano Strutturato

Righi Solutions - divisione offerte commerciali
Documento di analisi preliminare. Nessun codice scritto prima dell'approvazione di questo piano.
Data: 16 settembre 2026

---

## 1. Sintesi esecutiva e criticita principale

Il beta mostrato nello screenshot pianifica le attivita nel tempo ma non modella ne la capacita
della risorsa (ore disponibili contro ore allocate) ne la scadenza del cliente. Senza questi due
dati un pianificatore non puo rispondere alle due domande operative del responsabile di divisione:
"a chi posso dare questa RDO senza saturarlo?" e "quali offerte rischiano di saltare la consegna?".
Allo stato attuale lo strumento e un calendario condiviso ben disegnato, non un pianificatore di
capacita. Questa e la lacuna da chiudere per prima: tutto il resto e secondario.

Seconda criticita, di processo: il repository e vuoto (nessun commit) mentre esiste gia un
applicativo funzionante etichettato v1.0 beta. Prima di scrivere una riga di codice va deciso se si
estende quel codice o si riparte. Ripartire da zero costa settimane e rischia di perdere dettagli UX
gia risolti (curve di dipendenza, tratteggio non lavorativo, autosave).

Terza criticita, di adozione: il vincolo che lo strumento sia "veloce, facile, intuitivo" e
l'avanzamento "snello" non e un desiderata estetico, e il fattore di rischio numero uno. La ricerca
sull'adozione degli strumenti di pianificazione indica il carico di data entry come principale fonte
di resistenza, e riporta che solo il 15% delle organizzazioni di planning supera il 75% di adozione
digitale (dato Gartner 2023 citato da Whatfix). Ogni funzione aggiunta va quindi pagata in click.

---

## 2. Analisi dello screenshot

Distinguo cio che e osservabile direttamente da cio che e inferito, per non dare nulla per scontato.

### 2.1 Osservato (certo)

| Area | Elemento | Dettaglio |
|---|---|---|
| Intestazione | Branding | Logo righi solutions, titolo "Pianificazione Team", badge "v1.0 beta" |
| Intestazione | Navigazione | Tre sezioni: Pianificazione, Dashboard, Impostazioni |
| Intestazione | Stato salvataggio | Indicatore "Salvato" con pallino verde, pulsante "Aggiorna" |
| Intestazione | Utilita | Toggle tema scuro, logout |
| Barra strumenti | Navigazione temporale | Frecce avanti/indietro, pulsante "Oggi", intervallo "24 ago 2026 - 18 ott 2026" |
| Barra strumenti | Vista | Menu a tendina "Vista" con icona occhio |
| Barra strumenti | Raggruppamento | Selettore "Per progetto" |
| Barra strumenti | Filtro stato | Segmentato: Tutti / In corso / Completati |
| Barra strumenti | Filtri entita | RISORSA (Domenico Benassi), CLIENTE (Tutti), KAM (Tutti), pulsante azzera |
| Griglia | Colonne | DESCRIZIONE, PROGETTO, RISORSA, STATO |
| Griglia | Righe gruppo | Pallino colore, titolo progetto maiuscolo, chip cliente, chip KAM con avatar iniziali, conteggio attivita, codice opzionale (LON6) |
| Griglia | Righe attivita | Descrizione a tendina, progetto con pallino, risorsa a tendina, stato con indicatore |
| Tassonomia | Tipi attivita | "Analisi tecnica & RDO", "Sviluppo offerta" |
| Tassonomia | Stati | Non iniziata, In corso, In ritardo (Completata presumibile dal filtro) |
| Anagrafiche | Clienti | Torricelli, Cummins, Siad, Sei, Heidelberg |
| Anagrafiche | KAM | Gianluca Gusman, Luca Righi, Daniele Tozzi, Fabio Camera |
| Anagrafiche | Codici commessa | BCN01, PM1 L43682, MCC RIF. P26439, MCC COLLEFERRO, SIN04, LON6 |
| Timeline | Scala | Mese, settimana ISO (W35-W39), giorno con lettera e numero |
| Timeline | Oggi | Colonna 16 settembre evidenziata con badge e linea verticale |
| Timeline | Barre | Colorate per progetto, larghezza pari alla durata |
| Timeline | Dipendenze | Curve di collegamento tra barre (Analisi tecnica -> Sviluppo offerta) |
| Timeline | Fasce speciali | Banda tratteggiata verticale su circa 31 ago - 6 set, colonna rosata su 8 set, colonna azzurra su 15-16 set |
| Timeline | Marcatori | Triangolini sul bordo superiore di alcune bande progetto (es. PM1 L43682) |
| Timeline | Barre spezzate | Una barra viola con segmento centrale tratteggiato |

### 2.2 Inferito (probabile, da confermare)

| Inferenza | Confidenza | Motivo |
|---|---|---|
| Autosave attivo | Alta | Indicatore "Salvato" invece di un pulsante Salva |
| "Vista" controlla lo zoom temporale (giorno/settimana/mese) | Media | Posizione e icona, ma il contenuto del menu non e visibile |
| Esiste un raggruppamento alternativo "Per risorsa" | Media | Il selettore dice "Per progetto", implica alternative non visibili |
| Banda tratteggiata = indisponibilita della risorsa filtrata | Media | Il filtro e su Domenico Benassi e la banda attraversa tutte le righe |
| Colonna rosata su 8 set = festivita o giorno critico | Bassa | Nessun dato aziendale per confermare |
| Triangolini = milestone o scadenza offerta | Media | Convenzione grafica diffusa, ma senza etichetta non e verificabile |
| Barre modificabili via drag and drop | Media | Standard per questo tipo di UI, non deducibile da uno statico |
| Segmento tratteggiato dentro una barra = attraversamento periodo non lavorativo | Media | Coerente con la banda verticale |

### 2.3 Da verificare con il codice o con una demo

- Se le dipendenze ricalcolano le date a valle quando si sposta un predecessore.
- Se esiste un concetto di ore o giorni-uomo dietro la barra o solo date di inizio e fine.
- Se lo stato "In ritardo" e calcolato (data fine passata e stato non completato) o inserito a mano.
- Chi crea le righe progetto: inserimento manuale o import da gestionale.
- Se esiste gia una persistenza server o solo stato locale del browser.
- Cosa contiene oggi la Dashboard e cosa contiene Impostazioni.

---

## 3. Gap analysis

Il beta copre bene la dimensione "quando". Copre parzialmente "chi". Non copre "quanto" ne "entro
quando" ne "com'e andata".

| Dimensione | Domanda del responsabile | Copertura attuale | Giudizio |
|---|---|---|---|
| Quando | Quando si lavora a questa offerta? | Timeline con barre e dipendenze | Adeguata |
| Chi | Chi ci lavora? | Assegnazione a tendina, filtro risorsa | Adeguata per la singola attivita |
| Quanto | La persona e satura o ha spazio? | Assente | Lacuna critica |
| Entro quando | Qual e la scadenza del cliente e quanto margine resta? | Forse i triangolini, non esplicito | Lacuna critica |
| Cosa non e ancora pianificato | Quali RDO sono arrivate e non hanno ancora un assegnatario? | Assente (si vede solo cio che e gia in timeline) | Lacuna critica |
| Perche e ferma | L'attivita e bloccata in attesa di un dato del cliente o del fornitore? | Stato "In ritardo" non distingue la causa | Lacuna rilevante |
| Com'e andata | Abbiamo vinto? Con che tempi? | Assente | Lacuna rilevante |

Nota sul terzo punto. Nello screenshot il filtro stato offre Tutti / In corso / Completati. Manca la
categoria logicamente precedente: arrivata e non ancora pianificata. E' proprio li che il
responsabile di divisione prende la decisione che lo strumento dovrebbe supportare.

---

## 4. Funzionalita candidate individuate dalla ricerca

Elenco grezzo, prima della selezione. Ogni voce ha la fonte.

| # | Funzionalita | Da dove | Utile a |
|---|---|---|---|
| F01 | Heatmap di capacita per risorsa | Float, Resource Guru (Schedule Heatmap, Availability Bar), Runn | Responsabile |
| F02 | Tasso di saturazione con formula lavoro pianificato / capacita disponibile x 100 | Planyway, ProjectManager, Saviom | Responsabile |
| F03 | Soglie di allarme sovrallocazione con codifica colore | Runn, Float, Teamdeck | Entrambi |
| F04 | Capacita netta (ferie, part-time, festivita, riunioni) invece di capacita teorica | Saviom, Prism PPM | Responsabile |
| F05 | Placeholder e ruoli non assegnati per lavoro non confermato | Resource Guru, Runn (Guided Placeholder Workflow, dic 2025), Projectworks | Responsabile |
| F06 | Soft booking / prenotazione provvisoria | Saviom | Responsabile |
| F07 | Matrice competenze e ricerca per skill | Saviom, Float, Retain | Responsabile |
| F08 | Scenari what-if e confronto piani alternativi | Saviom, Runn, Float | Responsabile |
| F09 | Drag and drop come modalita primaria di pianificazione | LogRocket, Netronic, SVAR | Entrambi |
| F10 | Ricalcolo automatico della catena di dipendenze allo spostamento | LogRocket, ClickUp | Entrambi |
| F11 | Scheda attivita ricca (team, responsabile, dettagli) senza aprire pagine | Netronic, Page Flows | Entrambi |
| F12 | Scorecard bid/no-bid con criteri pesati | Shipley via GovEagle, BidClarity, APMP | Responsabile |
| F13 | Win rate segmentato per tipo offerta e cliente | Bidhive, Klipfolio, Sparrow Genie | Direzione |
| F14 | Lead time di preparazione offerta | Bidhive, Responsive, AutoRFP | Direzione |
| F15 | Benchmark settoriali: 25-32 ore medie per risposta, 64% entro 10 giorni | Sparrow Genie / Bidhive via ricerca | Direzione |
| F16 | Cost-to-bid ratio e valore medio offerta | Klipfolio, Bidhive | Direzione |
| F17 | Down-select rate e tempo di risposta degli specialisti | Bidhive | Direzione |
| F18 | Versionamento revisioni offerta con timestamp e traccia delle modifiche | Cincom, MfgCal | Entrambi |
| F19 | Notifica automatica di scadenza validita offerta | Salesboom, SuperOps | KAM |
| F20 | Promemoria di follow-up post invio | Salesboom, MfgCal | KAM |
| F21 | Tracciamento esito e motivazione vinta/persa | Cincom, QuantumByte, Orgzit | Direzione |
| F22 | Limiti WIP per colonna o per persona con evidenza rossa al superamento | Atlassian, Businessmap, Kanban Tool, Workfront | Responsabile |
| F23 | Aging del lavoro in corso | Businessmap | Responsabile |
| F24 | SSO con Microsoft Entra ID | Microsoft Learn | IT |
| F25 | Adaptive Card in Teams e Outlook per azione senza aprire l'app | Microsoft Learn, Stoneridge | Operatore |
| F26 | Riduzione del data entry via template e default | Whatfix, ReWork | Operatore |

---

## 5. Selezione ragionata

Criterio di selezione: una funzione entra solo se risponde a una domanda che oggi il responsabile
non puo risolvere in meno di dieci secondi, e se il suo costo in click per l'operatore e prossimo a
zero. Ho scartato tutto cio che richiede all'operatore di compilare campi che nessuno legge.

Punteggio: Impatto 1-5 sulla decisione quotidiana, Costo 1-5 di implementazione, Attrito 1-5 di
data entry aggiuntivo per l'operatore (piu basso e meglio).

### 5.1 Must have - versione 1.1

| ID | Funzione | Da | Impatto | Costo | Attrito | Perche |
|---|---|---|---|---|---|---|
| M1 | Stima in ore per attivita, con preset per tipo | F02 | 5 | 2 | 1 | Senza un numero non esiste carico. Preset per tipo attivita: l'operatore non digita nulla nel caso normale |
| M2 | Vista Per risorsa con barra di capacita e heatmap settimanale | F01 F03 | 5 | 4 | 0 | E' la vista in cui il responsabile assegna. Zero attrito: deriva dai dati gia inseriti |
| M3 | Scadenza cliente come campo esplicito, con marcatore e semaforo di margine | F19 | 5 | 2 | 1 | Un campo data per offerta. Trasforma la timeline in uno strumento di rischio |
| M4 | Calendario indisponibilita: ferie, festivita, chiusure, percentuale contratto | F04 | 4 | 3 | 1 | La capacita teorica e sempre sbagliata. Inserimento sporadico, non quotidiano |
| M5 | Coda "Da assegnare" con trascinamento sulla timeline | F05 F06 | 5 | 3 | 1 | Rende visibile la domanda in ingresso. E' il punto di decisione del responsabile |
| M6 | Stato "Bloccata" con causale breve a scelta chiusa | F23 | 4 | 1 | 1 | Distingue il ritardo nostro dal ritardo altrui. Una tendina, non un testo libero |
| M7 | Avanzamento a un click: cambio stato da menu contestuale e da tastiera | F26 | 5 | 2 | 0 | Requisito esplicito del committente. Nessuna percentuale di completamento |
| M8 | Ricalcolo della catena di dipendenze allo spostamento | F10 | 4 | 3 | 0 | Se il beta non lo fa gia, ogni slittamento diventa lavoro manuale |

### 5.2 Should have - versione 1.2

| ID | Funzione | Da | Impatto | Costo | Attrito | Perche |
|---|---|---|---|---|---|---|
| S1 | Dashboard direzionale: saturazione, offerte a rischio, WIP per persona, lead time | F13 F14 F22 | 4 | 3 | 0 | Serve alla direzione per giustificare organico e priorita |
| S2 | Esito offerta con motivazione a scelta chiusa e valore | F21 | 4 | 2 | 2 | Un click alla chiusura. Abilita il win rate |
| S3 | Revisioni offerta come attivita ricorsive sulla stessa commessa | F18 | 4 | 2 | 1 | Nel settore quadri la revisione post invio e la norma, non l'eccezione |
| S4 | Notifiche mirate: digest giornaliero e alert scadenza a rischio | F19 F20 F25 | 3 | 3 | 0 | Porta lo strumento dove le persone gia stanno, invece di pretendere che lo aprano |
| S5 | Consuntivo ore a chiusura attivita, un campo precompilato con la stima | F15 | 3 | 2 | 2 | Alimenta la taratura dei preset di M1. Senza questo le stime restano opinioni |
| S6 | Limite WIP per risorsa con evidenza visiva al superamento | F22 | 3 | 2 | 0 | Rende operativa la heatmap: non solo "e carico" ma "hai superato la soglia" |

### 5.3 Could have - versione 2

| ID | Funzione | Impatto | Costo | Nota |
|---|---|---|---|---|
| C1 | Scenari what-if con confronto | 3 | 5 | Utile solo quando il volume di offerte rende il piano non intuitivo |
| C2 | Matrice competenze e suggerimento assegnatario | 3 | 4 | Diventa utile sopra i 10-12 tecnici o con forte specializzazione |
| C3 | Scorecard bid/no-bid | 2 | 3 | Ha senso se la divisione rifiuta davvero delle RDO. Da verificare |
| C4 | Integrazione anagrafiche da gestionale o CRM | 4 | 5 | Alto impatto ma dipende da sistemi esterni. Tenere pronta l'interfaccia di import |
| C5 | Previsione capacita a 8-12 settimane | 3 | 4 | Richiede pipeline attendibile a monte |

### 5.4 Won't have - esclusioni esplicite

Queste esclusioni sono la parte piu importante della selezione: sono cio che tiene lo strumento
veloce.

| Escluso | Motivo |
|---|---|
| Percentuale di completamento manuale | Dato sempre inventato, richiede aggiornamento continuo, non cambia nessuna decisione. Sostituito dagli stati |
| Gestione documentale dell'offerta | Vive gia in SharePoint o nel gestionale. Duplicarla crea disallineamento |
| Configuratore prezzi / CPQ | Dominio diverso, progetto diverso |
| Timesheet completo | Trasforma lo strumento in un sistema di controllo e ne uccide l'adozione. Basta il consuntivo di S5 |
| Dipendenze diverse da Fine-Inizio, con ritardo e anticipo | Complessita non giustificata: nel processo offerta la sequenza e quasi sempre lineare |
| Chat o commenti a thread | Teams esiste gia |
| Gestione post-vendita e avanzamento commessa | Fuori perimetro: il portale finisce alla consegna dell'offerta |
| Livellamento automatico delle risorse | Genera piani che nessuno riconosce e che il responsabile poi disfa a mano |

---

## 6. Modello dati proposto

Entita minime per sostenere Must e Should. Nomi in italiano per aderenza al dominio.

```
Cliente            id, ragione_sociale, codice_esterno, attivo
Persona            id, nome, cognome, email, ruolo, entra_object_id, capacita_ore_giorno,
                   percentuale_contratto, attiva, colore
Competenza         id, nome                       (C2, predisposto ma non usato in v1.1)
PersonaCompetenza  persona_id, competenza_id, livello
Offerta            id, codice, descrizione, cliente_id, kam_id, valore_stimato,
                   data_richiesta, data_scadenza_cliente, priorita, stato,
                   esito, motivo_esito, data_esito, note
Attivita           id, offerta_id, tipo_attivita, persona_id (nullable = da assegnare),
                   stima_ore, data_inizio, data_fine, stato, causale_blocco,
                   consuntivo_ore, ordine
Dipendenza         predecessore_id, successore_id, tipo (solo FS in v1)
TipoAttivita       id, nome, stima_default_ore, colore, ordine
Indisponibilita    id, persona_id (nullable = aziendale), data_inizio, data_fine,
                   tipo (ferie|permesso|festivita|chiusura|formazione), ore_giorno
Revisione          id, offerta_id, numero, data, motivo, attivita_id
EventoAudit        id, entita, entita_id, utente_id, azione, prima, dopo, timestamp
```

Stati previsti.

| Entita | Stati | Note |
|---|---|---|
| Offerta | Da pianificare, Pianificata, In lavorazione, Consegnata, In revisione, Chiusa | "Da pianificare" alimenta la coda M5 |
| Offerta.esito | Vinta, Persa, Annullata dal cliente, Non offerta | Popolato solo a stato Chiusa |
| Attivita | Non iniziata, In corso, Bloccata, Completata | "In ritardo" resta derivato, non inserito |
| Attivita.causale_blocco | Attesa dato cliente, Attesa quotazione fornitore, Attesa specifica tecnica, Priorita superiore, Altro | Scelta chiusa |

Regole derivate, non inserite a mano.

| Indicatore | Formula | Fonte metodologica |
|---|---|---|
| In ritardo | data_fine < oggi e stato != Completata | Convenzione |
| Saturazione risorsa | ore allocate nel periodo / capacita netta nel periodo x 100 | Planyway, ProjectManager, Saviom |
| Capacita netta | capacita_ore_giorno x giorni lavorativi - indisponibilita | Saviom, Prism PPM |
| Margine su scadenza | data_scadenza_cliente - data_fine ultima attivita | Derivato |
| Lead time offerta | data consegna - data_richiesta | Bidhive, Responsive |
| Win rate | offerte vinte / offerte con esito x 100 | Klipfolio, Bidhive |

Soglie colore proposte per la heatmap, con nota: la letteratura colloca il buon utilizzo tra il 78%
e il 100%, e segnala che il 100% costante porta a ritardi e burnout (Birdview, Saviom, Indeed).
Non sono soglie universali: vanno tarate sul comportamento reale della divisione dopo due mesi di
dati.

| Fascia | Colore | Significato |
|---|---|---|
| 0-40% | Grigio chiaro | Sottoutilizzo, spazio per assegnare |
| 41-85% | Verde | Carico sano |
| 86-100% | Ambra | Pieno, nessun margine per imprevisti |
| oltre 100% | Rosso | Sovrallocazione, decisione richiesta |

---

## 7. Architettura e scelte tecniche

Premessa: la scelta dipende dalla risposta alla domanda D1 del capitolo 12 (riuso o riscrittura del
beta). Quanto segue vale nell'ipotesi di partenza da zero o di riscrittura del solo frontend.

### 7.1 Stack proposto

| Livello | Scelta | Alternativa | Motivo |
|---|---|---|---|
| Frontend | React con TypeScript, Next.js App Router | Vite + React puro | Routing, SSR per la dashboard, ecosistema maturo |
| Stile | Tailwind CSS con token di tema | CSS Modules | Il beta ha gia tema chiaro/scuro: i token servono |
| Stato server | TanStack Query con aggiornamento ottimistico | SWR | L'autosave richiede ottimismo e rollback |
| Backend | API route Next.js o servizio Node separato | .NET se l'IT interno e Microsoft | Coerenza di linguaggio, team piccolo |
| Database | PostgreSQL | SQL Server se gia presente in azienda | Range di date, esclusioni, query di aggregazione |
| ORM | Prisma o Drizzle | - | Migrazioni versionate obbligatorie |
| Autenticazione | Entra ID (OIDC) via Auth.js | Utenti locali | Sono su Microsoft 365: nessuna password nuova, ruoli da gruppi AD |
| Notifiche | Microsoft Graph: Teams e Outlook | SMTP semplice | S4 richiede di raggiungere le persone dove gia stanno |
| Hosting | Azure App Service o container on-premise | Vercel | Coerenza con il tenant Microsoft e con i dati commerciali |

Nota su Entra ID: l'SSO evita la creazione di credenziali dedicate e permette di derivare il ruolo
(responsabile, operatore, KAM, sola lettura) dai gruppi di directory. Le Adaptive Card in Teams e in
Outlook consentono azioni dirette dal messaggio, ma richiedono strumenti di progettazione diversi
per i due canali (Actionable Message Designer per Outlook, Adaptive Cards Designer per Teams).

### 7.2 Componente timeline: la decisione piu impattante

| Opzione | Licenza | Pro | Contro |
|---|---|---|---|
| Renderer custom (CSS grid + SVG per le dipendenze) | - | Controllo totale su heatmap, chip, tendine in griglia, tema; nessun vincolo di DOM | 1500-2500 righe da scrivere e mantenere; drag and drop e virtualizzazione da implementare |
| Frappe Gantt | MIT | Leggerissimo, rapido da montare | Funzionalita minime, non pensato per righe risorsa e heatmap |
| DHTMLX Gantt Standard | GPL (edizione standard) | Il piu maturo tra gli open source, percorso di upgrade | La GPL e incompatibile con software proprietario non distribuito solo se si distribuisce; da valutare con attenzione legale. Versione commerciale a pagamento |
| SVAR React Gantt | MIT (free) + PRO commerciale | Nativo React, licenza free permissiva | Progetto giovane, personalizzazione profonda ancora da verificare |
| Bryntum Gantt | Commerciale, da circa 940 USD per sviluppatore | Il piu completo: righe riepilogo, dipendenze, istogramma risorse | Costo, e comunque da piegare a un layout non standard |

Raccomandazione: renderer custom. [Probabile] Il layout richiesto non e un Gantt classico: ha
tendine editabili nella griglia di sinistra, chip cliente e KAM, bande progetto, righe di capacita
con heatmap e barre spezzate sui periodi non lavorativi. Adattare una libreria a questo layout
costa tipicamente piu che scriverlo, e ogni personalizzazione diventa debito verso la libreria.
Lo screenshot suggerisce peraltro che il beta abbia gia un renderer proprio: in quel caso la
decisione e gia presa e va solo estesa.
Rischio da mettere a verbale: se in fase 1 il renderer custom sfora di oltre il 50% la stima,
ripiegare su SVAR o Bryntum invece di insistere.

### 7.3 Prestazioni

Il requisito "veloce" va reso misurabile, altrimenti non e verificabile.

| Metrica | Obiettivo |
|---|---|
| Primo caricamento utile della timeline | sotto 1,5 s su rete aziendale |
| Cambio filtro o raggruppamento | sotto 150 ms, senza chiamata al server (filtro client su dataset gia caricato) |
| Spostamento barra: riscontro visivo | immediato (ottimistico), conferma server entro 500 ms |
| Cambio stato | immediato, con rollback visibile in caso di errore |
| Righe gestibili senza scatti | almeno 500 attivita, tramite virtualizzazione verticale |

---

## 8. UX: schermate e flussi

### 8.1 Le tre schermate

1. Pianificazione (evoluzione dello schermo attuale). Si aggiungono: il raggruppamento Per risorsa
   con riga di capacita e heatmap, il pannello laterale "Da assegnare", il marcatore di scadenza
   cliente con semaforo di margine.
2. Dashboard. Non un muro di grafici: cinque riquadri che rispondono a cinque domande
   (capitolo 9).
3. Impostazioni. Persone e capacita, tipi attivita e stime default, calendario aziendale, clienti,
   KAM, soglie di saturazione e WIP.

### 8.2 I quattro flussi da ottimizzare al secondo

| Flusso | Attore | Obiettivo | Progettazione |
|---|---|---|---|
| Arriva una RDO, va assegnata | Responsabile | Meno di 30 secondi | La RDO entra nella coda "Da assegnare" con stima di default per tipo. Il responsabile apre Per risorsa, vede le fasce libere, trascina. Nessuna form |
| Aggiornare lo stato | Operatore | Un click | Menu contestuale sulla barra, o tasti rapidi 1/2/3/4 sulla riga selezionata. Nessuna finestra modale, nessun campo obbligatorio salvo la causale se lo stato e Bloccata |
| Capire chi e libero giovedi | Responsabile | Uno sguardo | Riga di capacita sempre visibile in testa a ogni gruppo risorsa, con colore per giorno |
| Capire cosa rischia di saltare | Responsabile | Uno sguardo | Riquadro "A rischio" nella dashboard e ordinamento della timeline per margine crescente |

### 8.3 Principi di interazione

- Il drag and drop e la modalita primaria di pianificazione, non un di piu. La ricerca sulle
  interfacce timeline riporta che la quasi totalita delle programmazioni avviene per trascinamento
  (dato riportato da fonti secondarie, non verificato direttamente sulla fonte originale).
- Nessun salvataggio esplicito: autosave con indicatore, come gia fa il beta.
- Nessun campo obbligatorio a testo libero nei flussi quotidiani. Ogni causale e a scelta chiusa.
- Ogni informazione derivabile va derivata: "In ritardo" non si inserisce, si calcola.
- Annulla sempre disponibile per le ultime azioni di pianificazione.
- Doppio livello di lettura: colore per lo stato immediato, numero solo a richiesta (tooltip).

---

## 9. Dashboard: cinque domande, cinque riquadri

| Riquadro | Domanda | Contenuto | Destinatario |
|---|---|---|---|
| Carico prossime 4 settimane | Abbiamo capacita? | Istogramma per persona e settimana, allocato contro capacita netta | Responsabile |
| A rischio | Cosa salta? | Elenco offerte ordinate per margine su scadenza crescente, con causale se bloccate | Responsabile |
| Lavoro in corso | Chi ha troppe cose aperte? | Conteggio attivita In corso per persona contro limite WIP, e aging della piu vecchia | Responsabile |
| Tempi di risposta | Quanto ci mettiamo? | Mediana del lead time per tipo offerta e per cliente, ultimi 3-6 mesi | Direzione |
| Esiti | Vinciamo? | Win rate e valore per cliente, KAM, tipologia, con motivazioni delle perse | Direzione |

Riferimenti di confronto esterni da usare con prudenza: la letteratura sulle risposte a gara riporta
una media di 25-32 ore di lavoro per risposta, con circa il 64% completate entro 10 giorni. Sono
dati su gare complesse, quindi non direttamente trasferibili a una RDO per quadro BT: servono come
ordine di grandezza, non come obiettivo. I valori di riferimento veri vanno costruiti sui primi tre
mesi di dati interni.

---

## 10. Roadmap

Le stime sono in giornate-uomo di uno sviluppatore esperto e sono [Congetturali] finche non si
conosce lo stato del codice esistente. Vanno riviste dopo la risposta a D1.

### Fase 0 - Allineamento (2-3 gg)

- Accesso al codice del beta e valutazione riuso.
- Sessione di 90 minuti con il responsabile di divisione e due operatori: osservazione del processo
  reale, non intervista.
- Congelamento della tassonomia: tipi attivita, stati, causali di blocco, esiti.
- Definizione delle stime di default per tipo attivita.

### Fase 1 - Fondamenta della capacita (18-26 gg)

| Attivita | Stima |
|---|---|
| Modello dati, migrazioni, seed anagrafiche | 3-5 |
| Autenticazione Entra ID e ruoli | 2-3 |
| Stima ore e preset per tipo (M1) | 2 |
| Vista Per risorsa con barra capacita e heatmap (M2) | 5-8 |
| Scadenza cliente, marcatore, semaforo margine (M3) | 2-3 |
| Calendario indisponibilita (M4) | 2-3 |
| Coda Da assegnare con trascinamento (M5) | 3 |
| Stato Bloccata con causale e avanzamento a un click (M6, M7) | 2 |
| Ricalcolo dipendenze (M8) se assente | 2-3 |

Criterio di uscita: il responsabile riesce ad assegnare una RDO reale guardando la saturazione,
senza chiedere nulla a nessuno.

### Fase 2 - Chiusura del ciclo (14-20 gg)

| Attivita | Stima |
|---|---|
| Esito, motivazione, valore (S2) | 2 |
| Revisioni offerta (S3) | 2-3 |
| Dashboard cinque riquadri (S1) | 5-7 |
| Notifiche Teams e Outlook (S4) | 3-5 |
| Consuntivo ore (S5) | 1-2 |
| Limiti WIP (S6) | 1 |

Criterio di uscita: la direzione legge il win rate e il lead time senza chiederli a nessuno.

### Fase 3 - Solo se i dati lo giustificano (15-25 gg)

Scenari what-if, matrice competenze, scorecard bid/no-bid, integrazione anagrafiche.
Regola: nessuna di queste parte prima di tre mesi di uso reale della fase 2. Si decide sui dati,
non sulle ipotesi.

---

## 11. Rischi e mitigazioni

| # | Rischio | Probabilita | Impatto | Mitigazione |
|---|---|---|---|---|
| R1 | Lo strumento non viene aggiornato e i dati diventano falsi | Alta | Critico | Avanzamento a un click, stime precompilate, digest in Teams, zero campi obbligatori a testo libero |
| R2 | Le stime ore non vengono inserite e la heatmap resta vuota | Alta | Critico | Stima di default per tipo attivita: il campo e sempre popolato, l'operatore corregge solo se serve |
| R3 | Riscrittura da zero di quanto gia funziona | Media | Alto | Decisione D1 in fase 0 prima di qualsiasi sviluppo |
| R4 | Doppio inserimento rispetto al gestionale esistente | Media | Alto | Import anagrafiche clienti e commesse anche solo via file; mai ridigitare un codice commessa |
| R5 | Il renderer custom sfora i tempi | Media | Medio | Punto di controllo a meta fase 1 con ripiego su libreria |
| R6 | Le soglie di saturazione generano allarmi ignorati | Media | Medio | Soglie configurabili, taratura dopo due mesi di dati reali |
| R7 | Ambito che si allarga verso il post-vendita | Media | Alto | Le esclusioni del capitolo 5.4 sono vincolanti, non indicative |
| R8 | Dati commerciali (valori offerte, win rate) visibili a chi non deve | Media | Alto | Ruoli da gruppi Entra: valore e esito visibili solo a responsabile, KAM e direzione |

---

## 12. Decisioni aperte, in ordine di urgenza

| # | Decisione | Perche blocca | Chi decide |
|---|---|---|---|
| D1 | Si estende il codice del v1.0 beta o si riparte? Con quale stack e attuale? | Cambia stima, architettura e roadmap | Committente |
| D2 | Quante persone in divisione e quante offerte al mese? | Determina se servono virtualizzazione, scenari, matrice competenze | Committente |
| D3 | Da dove arrivano clienti, commesse e KAM: inserimento manuale o gestionale/CRM? | Determina R4 e il punto di ingresso del processo | Committente + IT |
| D4 | Chi carica una nuova RDO nel portale e in che momento? | Senza un punto di ingresso chiaro la coda Da assegnare resta vuota | Committente |
| D5 | L'azienda e su Microsoft 365 con Entra ID utilizzabile per SSO? | Determina autenticazione e canale notifiche | IT |
| D6 | Dove va ospitato: Azure, on-premise, altro? Ci sono vincoli sui dati commerciali? | Determina hosting e sicurezza | IT |
| D7 | Si misura l'esito (vinta/persa) o il perimetro finisce alla consegna? | Determina se la fase 2 include S2 e il riquadro Esiti | Committente |
| D8 | Esiste il concetto di validita offerta e follow-up, o li gestisce il KAM altrove? | Determina se F19 e F20 entrano in perimetro | Committente |

---

## 13. Fonti

Pianificazione risorse e capacita
- https://www.float.com/resources/resource-management-software-tools
- https://www.runn.io/blog/capacity-planning-software
- https://www.saviom.com/solutions/software-evaluation/best/resource-management-software/
- https://resourceguruapp.com/blog/resource-management/solve-resource-overallocation
- https://resourceguruapp.com/blog/product-updates/resource-placeholders
- https://www.runn.io/blog/resource-overallocation
- https://www.float.com/resources/overallocation-of-resources
- https://www.saviom.com/resources/resource-management/articles/soft-booking/
- https://www.projectworks.com/blog/project-resource-management-with-placeholders
- https://planyway.com/blog/resource-utilization
- https://www.projectmanager.com/blog/capacity-utilization
- https://birdviewpsa.com/blog/capacity-utilization/
- https://www.saviom.com/resources/resource-management/articles/capacity-utilization-rate/
- https://prismppm.com/blog/project-resource-management/how-to-do-resource-capacity-planning-formulas-examples/

Gestione offerte, gare e KPI
- https://bidhive.com/key-performance-indicators-kpis-to-measure-proposal-success/
- https://www.klipfolio.com/resources/kpi-examples/sales/successful-unsuccessful-tenders
- https://www.responsive.io/blog/understanding-bid-software
- https://autorfp.ai/blog/bid-management
- https://www.sparrowgenie.com/blog/rfp-metrics-guide
- https://www.goveagle.com/blog/complete-shipley-process-guide
- https://bidclarity.ai/resources/bid-no-bid-decision-framework.html
- https://www.apmp.org/resources/bid-and-proposal-support/
- https://www.cincom.com/blog/cpq/manufacturing-quoting-software/
- https://mfgcal.com/rfq-tracker/
- https://www.salesboom.com/small-business-crm-management-software/web-based_sales_quote_management_software.html

UX timeline, Gantt e Kanban
- https://blog.logrocket.com/ux-design/reimagining-gantt-charts-ux-project-management/
- https://blog.netronic.com/how-to-improve-your-gantt-chart-user-experience
- https://pageflows.com/resources/gantt-chart-example/
- https://www.atlassian.com/agile/kanban/wip-limits
- https://businessmap.io/kanban-resources/kanban-analytics/kanban-aging-wip
- https://kanbantool.com/kanban-wip-limits

Librerie timeline
- https://bryntum.com/blog/top-5-javascript-gantt-chart-libraries/
- https://svar.dev/blog/top-react-gantt-charts/
- https://dhtmlx.com/blog/top-8-javascript-gantt-chart-libraries-2026/

Integrazione Microsoft
- https://learn.microsoft.com/en-us/microsoftteams/platform/samples/integrating-web-apps
- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/enable-sso-for-your-adaptive-cards-universal-action
- https://www.microsoft.com/en-us/security/business/identity-access/microsoft-entra-id

Adozione
- https://whatfix.com/blog/digital-adoption-challenges/
- https://resources.rework.com/libraries/post-sale-management/adoption-barriers-identification

Contesto aziendale
- https://www.righisolutions.com/soluzioni/impianti-industriali/
- https://anieautomazione.anie.it/scheda-azienda/4751/righi-elettroservizi-spa
