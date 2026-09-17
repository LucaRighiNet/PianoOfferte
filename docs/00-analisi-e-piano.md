# Portale Pianificazione Offerte - Analisi e Piano Strutturato

Righi Solutions - divisione offerte commerciali
Revisione 2, aggiornata con le decisioni del committente. Nessun codice applicativo scritto.
Data: 17 settembre 2026

---

## 0. Decisioni prese dal committente

| # | Decisione | Conseguenza principale |
|---|---|---|
| D1 | Riscrittura da zero, il beta non viene riusato | Il piano non e "aggiungere la capacita al beta": e ricostruire tutto cio che il beta gia fa e poi aggiungere. Lo sforzo triplica |
| D2 | 6-15 persone, 30-100 offerte al mese | Il volume rende illeggibile la vista per progetto dello screenshot. Cambia la vista primaria e impone la virtualizzazione |
| D3 | Tutto manuale nel portale, nessuna integrazione | L'inserimento rapido della RDO diventa una funzione critica, non un contorno. Circa 3 RDO al giorno da digitare |
| D7 | Il perimetro finisce alla consegna, nessun esito | Niente win rate. La dashboard passa da 5 a 4 riquadri e misura efficienza, non efficacia commerciale |

---

## 1. Sintesi esecutiva e criticita

### 1.1 Criticita di prodotto

Il beta pianifica le attivita nel tempo ma non modella ne la capacita della risorsa (ore
disponibili contro ore allocate) ne la scadenza del cliente. Senza questi due dati il responsabile
di divisione non puo rispondere alle sue due domande operative: "a chi posso dare questa RDO senza
saturarlo?" e "quali offerte rischiano di saltare la consegna?". Allo stato attuale e un calendario
condiviso ben disegnato, non un pianificatore di capacita.

### 1.2 Criticita di scala, emersa da D2

Lo screenshot mostra una riga per ogni attivita, dentro una banda per ogni progetto. Con 30-100
offerte al mese quel layout collassa. Calcolo esplicito, su una finestra visibile di 8 settimane:

| Grandezza | Ipotesi bassa (30/mese) | Ipotesi alta (100/mese) |
|---|---|---|
| Offerte nella finestra | circa 60 | circa 200 |
| Attivita (2-3 per offerta) | 120-180 | 400-600 |
| Righe totali con il layout attuale | 180-240 | 600-800 |
| Righe con vista per risorsa e impilamento | 6-15 | 6-15 espandibili |

Conclusione: la vista primaria non puo essere "Per progetto". Deve essere "Per risorsa", una corsia
per persona, con le attivita non sovrapposte impilate sulla stessa riga e l'espansione solo a
richiesta. La letteratura sulle timeline a molte corsie converge: sopra le 8 corsie serve scroll
verticale e si perde la visione d'insieme, e mostrare tutte le attivita su righe separate produce
sovraffollamento visivo (Lucen Software, Mobiscroll, Syncfusion).

### 1.3 Criticita di sforzo, emersa da D1

Riscrivere da zero significa ricostruire prima di innovare: shell applicativa, autenticazione, tema
chiaro e scuro, griglia, renderer della timeline, barre, dipendenze, zoom, bande non lavorative,
filtri, raggruppamenti, autosave. Il renderer della timeline da solo vale 8-12 giornate. La stima
complessiva del capitolo 10 e di 63-84 giornate-uomo contro le 32-46 che sarebbero bastate
estendendo un beta funzionante. La decisione e presa e procedo, ma va messa a verbale: non e una
differenza di rifinitura, sono circa due mesi-uomo.

### 1.4 Criticita di adozione

Il vincolo "veloce, facile, intuitivo" e l'avanzamento "snello" non sono desiderata estetici, sono
il rischio numero uno. La ricerca sull'adozione indica il carico di data entry come principale fonte
di resistenza, e riporta che solo il 15% delle organizzazioni di planning supera il 75% di adozione
digitale (dato Gartner 2023 citato da Whatfix). Con D3 (inserimento tutto manuale) questo rischio
aumenta: ogni secondo speso nel form di creazione RDO si moltiplica per 3 al giorno, 60 al mese.

### 1.5 Conseguenza di D7 da mettere a verbale

Escludendo l'esito, il portale non potra mai rispondere a "le offerte preparate di corsa le
perdiamo piu spesso?" ne "quali clienti ci fanno lavorare tanto e comprano poco?". E' una scelta
legittima: riduce l'attrito e tiene il perimetro stretto. Mitigazione senza costo: i campi esito,
motivo e valore restano nello schema dati come opzionali e non vengono mostrati in interfaccia.
Aggiungerli in futuro costera 2 giornate invece di 5, senza migrazione dolorosa.

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
| Barra strumenti | Navigazione temporale | Frecce avanti e indietro, pulsante "Oggi", intervallo "24 ago 2026 - 18 ott 2026" |
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
| Timeline | Dipendenze | Curve di collegamento tra barre (Analisi tecnica verso Sviluppo offerta) |
| Timeline | Fasce speciali | Banda tratteggiata su circa 31 ago - 6 set, colonna rosata su 8 set, colonna azzurra su 15-16 set |
| Timeline | Marcatori | Triangolini sul bordo superiore di alcune bande progetto |
| Timeline | Barre spezzate | Una barra viola con segmento centrale tratteggiato |

### 2.2 Inferito (probabile, da confermare)

| Inferenza | Confidenza | Motivo |
|---|---|---|
| Autosave attivo | Alta | Indicatore "Salvato" invece di un pulsante Salva |
| "Vista" controlla lo zoom temporale | Media | Posizione e icona, ma il contenuto del menu non e visibile |
| Esiste un raggruppamento alternativo "Per risorsa" | Media | Il selettore dice "Per progetto", implica alternative |
| Banda tratteggiata uguale indisponibilita della risorsa filtrata | Media | Il filtro e su una persona e la banda attraversa tutte le righe |
| Colonna rosata su 8 set uguale festivita o giorno critico | Bassa | Nessun dato aziendale per confermare |
| Triangolini uguale milestone o scadenza offerta | Media | Convenzione grafica diffusa, ma senza etichetta non e verificabile |
| Barre modificabili via trascinamento | Media | Standard per questo tipo di interfaccia, non deducibile da uno statico |

### 2.3 Cosa riprendere dal beta nella riscrittura

Anche senza riusare il codice, queste scelte del beta sono valide e vanno replicate, perche sono
gia state viste dagli utenti:

- Autosave con indicatore invece del pulsante Salva.
- Chip cliente e KAM con avatar a iniziali sulla riga di gruppo: densita informativa alta a costo
  visivo basso.
- Tendine editabili direttamente in griglia, senza aprire pannelli.
- Colore per progetto applicato coerentemente a pallino e barra.
- Marcatore del giorno corrente su tutta l'altezza.
- Filtri a un livello, sempre visibili, con azzeramento rapido.
- Tema chiaro e scuro.

---

## 3. Gap analysis

Il beta copre bene la dimensione "quando". Copre parzialmente "chi". Non copre "quanto", "entro
quando" e "cosa non e ancora pianificato".

| Dimensione | Domanda del responsabile | Copertura attuale | Giudizio |
|---|---|---|---|
| Quando | Quando si lavora a questa offerta? | Timeline con barre e dipendenze | Adeguata |
| Chi | Chi ci lavora? | Assegnazione a tendina, filtro risorsa | Adeguata sulla singola attivita |
| Quanto | La persona e satura o ha spazio? | Assente | Lacuna critica |
| Entro quando | Qual e la scadenza del cliente e quanto margine resta? | Forse i triangolini, non esplicito | Lacuna critica |
| Non pianificato | Quali RDO sono arrivate e non hanno assegnatario? | Assente | Lacuna critica |
| Perche e ferma | E' bloccata su un dato del cliente o del fornitore? | "In ritardo" non distingue la causa | Lacuna rilevante |
| Quanto siamo veloci | Qual e il tempo medio di preparazione? | Assente | Lacuna rilevante |

Nota sul filtro stato. Lo screenshot offre Tutti / In corso / Completati. Manca la categoria
logicamente precedente: arrivata e non ancora pianificata. E' esattamente li che il responsabile
prende la decisione che lo strumento dovrebbe supportare.

---

## 4. Funzionalita candidate individuate dalla ricerca

Elenco grezzo, prima della selezione. Ogni voce ha la fonte nel capitolo 13.

| # | Funzionalita | Da dove | Utile a |
|---|---|---|---|
| F01 | Heatmap di capacita per risorsa | Float, Resource Guru (Schedule Heatmap, Availability Bar), Runn | Responsabile |
| F02 | Saturazione con formula lavoro pianificato diviso capacita disponibile per 100 | Planyway, ProjectManager, Saviom | Responsabile |
| F03 | Soglie di allarme sovrallocazione con codifica colore | Runn, Float, Teamdeck | Entrambi |
| F04 | Capacita netta (ferie, part-time, festivita) invece di capacita teorica | Saviom, Prism PPM | Responsabile |
| F05 | Placeholder e ruoli non assegnati per lavoro non confermato | Resource Guru, Runn, Projectworks | Responsabile |
| F06 | Prenotazione provvisoria (soft booking) | Saviom | Responsabile |
| F07 | Matrice competenze e ricerca per skill | Saviom, Float, Retain | Responsabile |
| F08 | Scenari what-if e confronto piani alternativi | Saviom, Runn, Float | Responsabile |
| F09 | Trascinamento come modalita primaria di pianificazione | LogRocket, Netronic, SVAR | Entrambi |
| F10 | Ricalcolo automatico della catena di dipendenze | LogRocket, ClickUp | Entrambi |
| F11 | Scheda attivita ricca senza aprire pagine | Netronic, Page Flows | Entrambi |
| F12 | Scorecard bid/no-bid con criteri pesati | Shipley via GovEagle, BidClarity, APMP | Responsabile |
| F13 | Win rate segmentato per tipo offerta e cliente | Bidhive, Klipfolio, Sparrow Genie | Direzione |
| F14 | Lead time di preparazione offerta | Bidhive, Responsive, AutoRFP | Direzione |
| F15 | Benchmark: 25-32 ore medie per risposta, 64% entro 10 giorni | Sparrow Genie, Bidhive | Direzione |
| F16 | Cost-to-bid ratio e valore medio offerta | Klipfolio, Bidhive | Direzione |
| F17 | Down-select rate e tempo di risposta degli specialisti | Bidhive | Direzione |
| F18 | Versionamento revisioni offerta con timestamp | Cincom, MfgCal | Entrambi |
| F19 | Notifica automatica di scadenza | Salesboom, SuperOps | Responsabile, KAM |
| F20 | Promemoria di follow-up post invio | Salesboom, MfgCal | KAM |
| F21 | Tracciamento esito e motivazione vinta o persa | Cincom, QuantumByte, Orgzit | Direzione |
| F22 | Limiti WIP con evidenza rossa al superamento | Atlassian, Businessmap, Kanban Tool, Workfront | Responsabile |
| F23 | Aging del lavoro in corso | Businessmap | Responsabile |
| F24 | SSO con Microsoft Entra ID | Microsoft Learn | IT |
| F25 | Adaptive Card in Teams e Outlook per azione diretta dal messaggio | Microsoft Learn, Stoneridge | Operatore |
| F26 | Riduzione del data entry via template e valori di default | Whatfix, ReWork | Operatore |
| F27 | Impilamento delle attivita nella stessa corsia risorsa | Mobiscroll, Syncfusion, DayPilot, Lucen | Entrambi |
| F28 | Collasso e espansione dei gruppi per tenere leggibile la scala | Lucen, Mobiscroll | Entrambi |

---

## 5. Selezione ragionata

Criterio: una funzione entra solo se risponde a una domanda che oggi il responsabile non risolve in
meno di dieci secondi, e se il suo costo in click per l'operatore e prossimo a zero. Ho scartato
tutto cio che chiede di compilare campi che nessuno legge.

Punteggio: Impatto 1-5 sulla decisione quotidiana, Costo 1-5 di implementazione, Attrito 1-5 di data
entry aggiuntivo (piu basso e meglio).

### 5.1 Must have

| ID | Funzione | Da | Impatto | Costo | Attrito | Perche |
|---|---|---|---|---|---|---|
| M1 | Stima in ore per attivita, con preset per tipo | F02 | 5 | 2 | 1 | Senza un numero non esiste carico. Il preset riempie il campo da solo: l'operatore corregge solo l'eccezione |
| M2 | Vista Per risorsa con corsia unica, impilamento, barra di capacita e heatmap | F01 F03 F27 | 5 | 4 | 0 | Vista primaria imposta da D2. E' dove il responsabile assegna. Zero attrito: deriva dai dati gia inseriti |
| M3 | Scadenza cliente esplicita, con marcatore e semaforo di margine | F19 | 5 | 2 | 1 | Un campo data per offerta. Trasforma la timeline in strumento di rischio |
| M4 | Calendario indisponibilita: ferie, festivita, chiusure, percentuale contratto | F04 | 4 | 3 | 1 | La capacita teorica e sempre sbagliata. Inserimento sporadico, non quotidiano |
| M5 | Coda "Da assegnare" con trascinamento sulla timeline | F05 F06 | 5 | 3 | 1 | Rende visibile la domanda in ingresso. E' il punto di decisione del responsabile |
| M6 | Stato "Bloccata" con causale a scelta chiusa | F23 | 4 | 1 | 1 | Distingue il ritardo nostro da quello altrui. Una tendina, mai testo libero |
| M7 | Avanzamento a un click: menu contestuale e tasti rapidi | F26 | 5 | 2 | 0 | Requisito esplicito del committente. Nessuna percentuale di completamento |
| M8 | Inserimento RDO in meno di 30 secondi, con template attivita per tipo offerta | F26 | 5 | 3 | 2 | Promosso a Must da D3: circa 3 RDO al giorno digitate a mano, e l'unico punto di ingresso dei dati |
| M9 | Ricalcolo della catena di dipendenze allo spostamento | F10 | 3 | 3 | 0 | Utile ma non vitale: la sequenza offerta e quasi sempre lineare e corta. Primo candidato al taglio se serve comprimere |

### 5.2 Should have

| ID | Funzione | Da | Impatto | Costo | Attrito | Perche |
|---|---|---|---|---|---|---|
| S1 | Dashboard direzionale a quattro riquadri | F14 F22 F23 | 4 | 3 | 0 | Misura efficienza operativa. Senza esito (D7) non misura efficacia commerciale |
| S2 | Revisioni offerta come attivita ricorsive sulla stessa commessa | F18 | 4 | 2 | 1 | Nel settore quadri la revisione post invio e la norma, non l'eccezione. Senza questo il lead time misurato e falso |
| S3 | Notifiche mirate: digest giornaliero e alert scadenza a rischio | F19 F25 | 3 | 3 | 0 | Porta lo strumento dove le persone gia stanno, invece di pretendere che lo aprano |
| S4 | Consuntivo ore a chiusura attivita, campo precompilato con la stima | F15 | 3 | 2 | 2 | Alimenta la taratura dei preset di M1. Senza, le stime restano opinioni per sempre |
| S5 | Limite WIP per risorsa con evidenza al superamento | F22 | 3 | 2 | 0 | Rende operativa la heatmap: non solo "e carico" ma "ha superato la soglia" |
| S6 | Viste alternative per progetto, cliente, KAM, con collasso di default | F28 | 3 | 2 | 0 | Con i volumi di D2 la vista per progetto serve solo filtrata e collassata |

### 5.3 Could have, versione 2

| ID | Funzione | Impatto | Costo | Quando ha senso |
|---|---|---|---|---|
| C1 | Scenari what-if con confronto | 3 | 5 | Solo se il volume rende il piano non intuitivo a occhio |
| C2 | Matrice competenze e suggerimento assegnatario | 3 | 4 | Con 15 persone e forte specializzazione diventa utile. Con 6, no |
| C3 | Scorecard bid/no-bid | 2 | 3 | Solo se la divisione rifiuta davvero delle RDO |
| C4 | Import anagrafiche da file | 3 | 2 | Se l'inserimento manuale di clienti e commesse diventa un peso |
| C5 | Creazione RDO da email inoltrata | 4 | 4 | Se il canale d'ingresso reale delle RDO e la posta |
| C6 | Esito offerta (riattivazione di D7) | 4 | 2 | Se la direzione chiede il win rate. Campi gia predisposti nello schema |

### 5.4 Won't have, esclusioni vincolanti

Queste esclusioni sono la parte piu importante della selezione: sono cio che tiene lo strumento
veloce.

| Escluso | Motivo |
|---|---|
| Percentuale di completamento manuale | Dato sempre inventato, richiede aggiornamento continuo, non cambia nessuna decisione. Sostituito dagli stati |
| Esito offerta in interfaccia | Fuori perimetro per decisione D7. Campi dati predisposti, interfaccia assente |
| Gestione documentale dell'offerta | Vive gia in SharePoint o nel gestionale. Duplicarla crea disallineamento |
| Configuratore prezzi, CPQ | Dominio diverso, progetto diverso |
| Timesheet completo | Trasforma lo strumento in sistema di controllo e ne uccide l'adozione. Basta il consuntivo di S4 |
| Dipendenze diverse da Fine-Inizio, con ritardo o anticipo | Complessita non giustificata da una sequenza lineare di 2-3 attivita |
| Chat o commenti a thread | Teams esiste gia |
| Gestione post-vendita e avanzamento commessa | Il portale finisce alla consegna dell'offerta |
| Livellamento automatico delle risorse | Genera piani che nessuno riconosce e che il responsabile poi disfa a mano |

---

## 6. Modello dati

```
Cliente            id, ragione_sociale, codice_esterno, attivo
Persona            id, nome, cognome, email, ruolo, entra_object_id, capacita_ore_giorno,
                   percentuale_contratto, limite_wip, attiva, colore
Offerta            id, codice, descrizione, cliente_id, kam_id, tipo_offerta_id,
                   valore_stimato (opz), data_richiesta, data_scadenza_cliente, priorita,
                   stato, note,
                   esito (null), motivo_esito (null), data_esito (null)   -- predisposti, D7
TipoOfferta        id, nome, template_attivita (json)          -- alimenta M8
TipoAttivita       id, nome, stima_default_ore, colore, ordine -- alimenta M1
Attivita           id, offerta_id, tipo_attivita_id, persona_id (null = da assegnare),
                   stima_ore, data_inizio, data_fine, stato, causale_blocco,
                   consuntivo_ore (null), ordine
Dipendenza         predecessore_id, successore_id                -- solo Fine-Inizio
Indisponibilita    id, persona_id (null = aziendale), data_inizio, data_fine,
                   tipo (ferie|permesso|festivita|chiusura|formazione), ore_giorno
Revisione          id, offerta_id, numero, data, motivo, attivita_id
EventoAudit        id, entita, entita_id, utente_id, azione, prima, dopo, timestamp
```

Stati.

| Entita | Valori | Note |
|---|---|---|
| Offerta | Da pianificare, Pianificata, In lavorazione, Consegnata, In revisione, Chiusa | "Da pianificare" alimenta la coda M5 |
| Attivita | Non iniziata, In corso, Bloccata, Completata | "In ritardo" resta derivato, mai inserito |
| Causale blocco | Attesa dato cliente, Attesa quotazione fornitore, Attesa specifica tecnica, Priorita superiore, Altro | Scelta chiusa |

Indicatori derivati, mai digitati.

| Indicatore | Formula | Fonte metodologica |
|---|---|---|
| In ritardo | data_fine minore di oggi e stato diverso da Completata | Convenzione |
| Saturazione risorsa | ore allocate nel periodo diviso capacita netta nel periodo per 100 | Planyway, ProjectManager, Saviom |
| Capacita netta | capacita_ore_giorno per giorni lavorativi meno indisponibilita | Saviom, Prism PPM |
| Margine su scadenza | data_scadenza_cliente meno data_fine dell'ultima attivita | Derivato |
| Lead time offerta | data consegna meno data_richiesta | Bidhive, Responsive |
| Aging WIP | oggi meno data di passaggio a In corso | Businessmap |

Soglie colore proposte per la heatmap. La letteratura colloca il buon utilizzo tra il 78% e il 100%
e segnala che il 100% costante porta a ritardi e burnout (Birdview, Saviom, Indeed). Non sono soglie
universali: vanno ritarate sui dati reali della divisione dopo due mesi.

| Fascia | Colore | Significato |
|---|---|---|
| 0-40% | Grigio chiaro | Sottoutilizzo, spazio per assegnare |
| 41-85% | Verde | Carico sano |
| 86-100% | Ambra | Pieno, nessun margine per imprevisti |
| oltre 100% | Rosso | Sovrallocazione, decisione richiesta |

---

## 7. Architettura e scelte tecniche

### 7.1 Stack proposto

| Livello | Scelta | Alternativa | Motivo |
|---|---|---|---|
| Frontend | React con TypeScript, Next.js App Router | Vite piu React puro | Routing, rendering server per la dashboard, ecosistema maturo |
| Stile | Tailwind CSS con token di tema | CSS Modules | Tema chiaro e scuro richiede token, non classi sparse |
| Stato server | TanStack Query con aggiornamento ottimistico | SWR | L'autosave richiede ottimismo e rollback |
| Backend | Route API di Next.js | Servizio Node separato, o .NET se l'IT interno e Microsoft | Team piccolo, un solo linguaggio |
| Database | PostgreSQL | SQL Server se gia in azienda | Intervalli di date, esclusioni, aggregazioni |
| ORM | Prisma o Drizzle | - | Migrazioni versionate obbligatorie |
| Autenticazione | Entra ID (OIDC) via Auth.js | Utenti locali | Nessuna password nuova, ruoli derivati dai gruppi di directory |
| Notifiche | Microsoft Graph verso Teams e Outlook | SMTP semplice | S3 deve raggiungere le persone dove gia stanno |
| Hosting | Azure App Service o container interno | Vercel | Coerenza con il tenant Microsoft e con la natura commerciale dei dati |

Nota su Entra ID: l'SSO evita credenziali dedicate e permette di derivare i ruoli (responsabile,
operatore, KAM, sola lettura) dai gruppi. Le Adaptive Card consentono azioni dirette dal messaggio,
ma richiedono strumenti di progettazione diversi per Teams e per Outlook (Actionable Message
Designer per Outlook, Adaptive Cards Designer per Teams).

### 7.2 Componente timeline: la decisione piu costosa

E' il pezzo piu rischioso della riscrittura: 8-12 giornate se sviluppato in proprio.

| Opzione | Licenza | Pro | Contro |
|---|---|---|---|
| Renderer proprio (CSS grid piu SVG per le dipendenze) | - | Controllo totale su impilamento, heatmap, chip, tendine in griglia, tema. Replica esatta del design gia validato nel beta | 8-12 giornate. Virtualizzazione e trascinamento da scrivere |
| Frappe Gantt | MIT | Leggerissimo, rapido da montare | Funzionalita minime, nessuna nozione di risorsa o capacita |
| DHTMLX Gantt Standard | GPL per l'edizione standard | Il piu maturo tra gli open source | La GPL va valutata legalmente prima dell'uso. Edizione commerciale a pagamento |
| SVAR React Gantt | MIT gratuita, PRO commerciale | Nativo React, licenza permissiva | Progetto giovane, personalizzazione profonda da verificare |
| Bryntum Gantt | Commerciale | Ha nativamente il Resource Histogram e la Resource Utilization view, cioe proprio la funzione M2 che manca | Prezzo da verificare direttamente: le fonti secondarie si contraddicono (circa 940 USD per sviluppatore secondo il blog Bryntum, circa 950 USD per funzionalita all'anno secondo Capterra). Il sito e risultato non raggiungibile in questa sessione. Design da piegare al layout voluto |

Raccomandazione: renderer proprio, ma con verifica falsificabile invece che per fede.
[Probabile] Il layout richiesto non e un Gantt classico: ha tendine editabili nella griglia di
sinistra, chip cliente e KAM, bande progetto, corsie risorsa con impilamento e heatmap, barre
spezzate sui periodi non lavorativi. Adattare una libreria a questo layout costa tipicamente piu che
scriverlo, e ogni personalizzazione diventa debito verso la libreria.

Verifica da inserire nel taglio 1, con criterio di uscita esplicito: al terzo giorno di sviluppo del
renderer deve essere dimostrato che 600 barre scorrono senza scatti, che il trascinamento e preciso
alla mezza giornata e che la riga di capacita si ridisegna in meno di 100 ms. Se non ci si arriva, si
passa a Bryntum senza discussione, dopo aver verificato il prezzo reale. Un fallimento al terzo
giorno costa tre giorni. Un fallimento al dodicesimo ne costa dodici.

### 7.3 Prestazioni, requisiti misurabili

Il requisito "veloce" va reso verificabile. Numeri derivati dal volume calcolato al capitolo 1.2.

| Metrica | Obiettivo |
|---|---|
| Primo caricamento utile della timeline | sotto 1,5 s su rete aziendale |
| Cambio filtro o raggruppamento | sotto 150 ms, senza chiamata al server: il dataset della finestra e gia in memoria |
| Trascinamento barra, riscontro visivo | immediato e ottimistico, conferma server entro 500 ms |
| Cambio stato | immediato, con rollback visibile in caso di errore |
| Righe gestibili senza scatti | 800 righe attivita, tramite virtualizzazione verticale |
| Granularita del trascinamento | mezza giornata: con 30-100 offerte al mese le attivita durano spesso mezza giornata |
| Creazione di una RDO | sotto 30 secondi, meno di 6 interazioni |

---

## 8. UX: schermate e flussi

### 8.1 Le tre schermate

1. Pianificazione. Vista primaria Per risorsa: una corsia per persona, riga di capacita con heatmap
   in testa alla corsia, attivita impilate. Pannello laterale "Da assegnare". Marcatore di scadenza
   cliente con semaforo di margine. Viste alternative per progetto, cliente, KAM, collassate di
   default.
2. Dashboard. Quattro riquadri, non un muro di grafici (capitolo 9).
3. Impostazioni. Persone e capacita, tipi offerta con template attivita, tipi attivita con stime
   default, calendario aziendale, clienti, KAM, soglie di saturazione e limiti WIP.

### 8.2 I quattro flussi da ottimizzare al secondo

| Flusso | Attore | Obiettivo | Progettazione |
|---|---|---|---|
| Arriva una RDO e va inserita | Responsabile o KAM | sotto 30 s | Un solo form su una riga: cliente con completamento automatico, codice, tipo offerta, scadenza. Il tipo offerta genera le attivita con stime di default. Richiamabile da ovunque con un tasto |
| La RDO va assegnata | Responsabile | sotto 30 s | La RDO e nella coda Da assegnare. Il responsabile guarda le corsie, vede le fasce libere dalla heatmap, trascina. Nessun form |
| Aggiornare lo stato | Operatore | un click | Menu contestuale sulla barra, o tasti 1-2-3-4 sulla riga selezionata. Nessuna finestra modale, nessun campo obbligatorio salvo la causale se lo stato e Bloccata |
| Capire cosa rischia di saltare | Responsabile | uno sguardo | Riquadro "A rischio" in dashboard, e ordinamento della timeline per margine crescente |

### 8.3 Principi di interazione

- Il trascinamento e la modalita primaria di pianificazione, non un accessorio. Le fonti sulle
  interfacce timeline riportano che la quasi totalita delle programmazioni avviene per trascinamento
  (dato riportato da fonti secondarie, non verificato sulla fonte originale: il sito che lo ospita
  e risultato non raggiungibile in questa sessione).
- Nessun salvataggio esplicito: autosave con indicatore, come gia fa il beta.
- Nessun campo obbligatorio a testo libero nei flussi quotidiani. Ogni causale e a scelta chiusa.
- Ogni informazione derivabile va derivata: "In ritardo" non si inserisce, si calcola.
- Annulla sempre disponibile sulle ultime azioni di pianificazione.
- Doppio livello di lettura: colore per lo stato immediato, numero solo a richiesta nel tooltip.
- Densita alta ma non compressa: con 15 corsie tutte le persone devono stare in una schermata senza
  scroll verticale.

---

## 9. Dashboard: quattro domande, quattro riquadri

Il quinto riquadro (esiti e win rate) e escluso da D7. Lo schema dati lo prevede, l'interfaccia no.

| Riquadro | Domanda | Contenuto | Destinatario |
|---|---|---|---|
| Carico prossime 4 settimane | Abbiamo capacita per accettare altro lavoro? | Istogramma per persona e settimana, allocato contro capacita netta | Responsabile |
| A rischio | Cosa salta? | Offerte ordinate per margine su scadenza crescente, con causale se bloccate | Responsabile |
| Lavoro in corso | Chi ha troppe cose aperte? | Attivita In corso per persona contro limite WIP, con aging della piu vecchia | Responsabile |
| Tempi di preparazione | Quanto ci mettiamo e stiamo migliorando? | Mediana del lead time per tipo offerta e per cliente, ultimi 3-6 mesi, con puntualita in percentuale | Direzione |

Riferimenti esterni da usare con prudenza: la letteratura sulle risposte a gara riporta 25-32 ore di
lavoro medie per risposta e circa il 64% completate entro 10 giorni. Sono dati su gare complesse,
non trasferibili a una RDO per quadro BT. Servono come ordine di grandezza. I valori di riferimento
veri vanno costruiti sui primi tre mesi di dati interni.

---

## 10. Roadmap e stime

Stime in giornate-uomo di uno sviluppatore esperto, [Congetturali], per riscrittura da zero (D1).
Il rilascio e in tre tagli, ciascuno utilizzabile in produzione: serve a portare valore prima della
fine, e a fermarsi se il valore non arriva.

### Fase 0 - Allineamento (3-4 gg)

- Sessione di 90 minuti con il responsabile e due operatori: osservazione del processo reale, non
  intervista. Cronometrare quanto tempo richiede oggi una assegnazione.
- Congelamento tassonomia: tipi offerta, tipi attivita, stati, causali di blocco.
- Stime di default per tipo attivita, prese dallo storico anche solo a memoria.
- Verifica prezzo reale Bryntum come piano B del renderer.
- Impostazione repository, ambienti, integrazione continua.

### Taglio 1 - "Pianificare davvero" (30-39 gg)

Criterio di uscita: il responsabile smette di usare Excel o la lavagna.

| Attivita | Stima |
|---|---|
| Schema dati, migrazioni, dati di esempio | 3 |
| Autenticazione Entra ID e ruoli | 2-3 |
| Shell applicativa, layout, token di tema chiaro e scuro | 3 |
| Anagrafiche: clienti, persone, KAM, tipi offerta, tipi attivita | 2 |
| Inserimento RDO rapido con template attivita (M8) | 3-4 |
| Renderer timeline: griglia, barre, zoom a 3 livelli, virtualizzazione, trascinamento e ridimensionamento a mezza giornata (con verifica al terzo giorno, par. 7.2) | 8-12 |
| Vista Per risorsa con impilamento corsie (M2, parte 1) | 3-4 |
| Stati a un click e causali di blocco (M6, M7) | 2 |
| Scadenza cliente e semaforo margine (M3) | 2 |
| Stima ore e preset per tipo (M1) | 2 |

### Taglio 2 - "Vedere il carico" (12-16 gg)

Criterio di uscita: il responsabile assegna guardando la saturazione, senza chiedere nulla a nessuno.

| Attivita | Stima |
|---|---|
| Calendario indisponibilita e capacita netta (M4) | 3 |
| Heatmap capacita e barra saturazione (M2, parte 2) | 4-6 |
| Coda Da assegnare con trascinamento (M5) | 3 |
| Dipendenze Fine-Inizio con ricalcolo catena (M9) | 2-4 |

### Taglio 3 - "Governare" (12-17 gg)

Criterio di uscita: la direzione legge lead time e puntualita senza chiederli a nessuno.

| Attivita | Stima |
|---|---|
| Viste per progetto, cliente, KAM con collasso (S6) | 2-3 |
| Revisioni offerta (S2) | 2-3 |
| Dashboard a quattro riquadri (S1) | 4-6 |
| Notifiche Teams e Outlook (S3) | 3-5 |
| Consuntivo ore (S4) e limiti WIP (S5) | 2 |

### Trasversale (6-8 gg)

Test, accessibilita da tastiera, irrobustimento, messa in esercizio, formazione, due settimane di
affiancamento post rilascio del taglio 1.

### Totale

| Voce | Giornate |
|---|---|
| Fase 0 | 3-4 |
| Taglio 1 | 30-39 |
| Taglio 2 | 12-16 |
| Taglio 3 | 12-17 |
| Trasversale | 6-8 |
| Totale | 63-84 |

Circa 13-17 settimane per uno sviluppatore, 7-9 settimane per due. Il taglio 1 da solo, che e gia
utilizzabile, vale 7-9 settimane per uno sviluppatore.

### Leve di compressione, se il tempo non c'e

| Leva | Risparmio | Costo della rinuncia |
|---|---|---|
| Rinunciare alle dipendenze (M9) | 2-4 gg | Gli slittamenti a catena si sistemano a mano. Con 2-3 attivita per offerta e sopportabile |
| Notifiche solo via email, niente Teams | 2-3 gg | Meno immediatezza, stessa copertura funzionale |
| Tema scuro rinviato al taglio 3 | 1 gg | Nessuna perdita funzionale |
| Usare Bryntum invece del renderer proprio | 5-8 gg, piu costo licenza | Il design si allontana da quello gia validato nel beta |
| Rinviare S2 revisioni al taglio 4 | 2-3 gg | Il lead time misurato resta parziale finche non si tracciano le revisioni |

---

## 11. Rischi e mitigazioni

| # | Rischio | Probabilita | Impatto | Mitigazione |
|---|---|---|---|---|
| R1 | Lo strumento non viene aggiornato e i dati diventano falsi | Alta | Critico | Avanzamento a un click, stime precompilate, digest in Teams, zero campi obbligatori a testo libero |
| R2 | Le stime ore non vengono inserite e la heatmap resta vuota | Alta | Critico | Stima di default per tipo attivita: il campo e sempre popolato, si corregge solo l'eccezione |
| R3 | L'inserimento manuale delle RDO diventa un collo di bottiglia (D3) | Alta | Alto | Form sotto i 30 secondi, template per tipo offerta, completamento automatico cliente, accesso di inserimento anche ai KAM. Da misurare col cronometro in fase 0 e dopo il taglio 1 |
| R4 | Il renderer proprio sfora i tempi | Media | Alto | Verifica falsificabile al terzo giorno con criteri numerici, ripiego su Bryntum (par. 7.2) |
| R5 | La vista per progetto resta primaria e collassa sui volumi | Media | Alto | Vista Per risorsa come primaria dal primo giorno, per progetto collassata di default |
| R6 | Le soglie di saturazione generano allarmi ignorati | Media | Medio | Soglie configurabili, ritaratura dopo due mesi di dati reali |
| R7 | L'ambito si allarga verso il post-vendita o il CPQ | Media | Alto | Le esclusioni del par. 5.4 sono vincolanti, non indicative |
| R8 | Dati commerciali visibili a chi non deve | Media | Alto | Ruoli da gruppi Entra: valore offerta visibile solo a responsabile, KAM e direzione |
| R9 | Senza esito (D7) la direzione non percepisce il valore dello strumento | Media | Medio | Il riquadro Tempi di preparazione deve mostrare un trend, non solo un numero. Campi esito predisposti per riattivazione rapida |
| R10 | Riscrivendo da zero si perdono dettagli UX gia risolti nel beta | Media | Medio | Il par. 2.3 elenca cosa replicare. Tenere lo screenshot come riferimento di accettazione |

---

## 12. Decisioni ancora aperte

| # | Decisione | Perche blocca | Quando serve |
|---|---|---|---|
| D4 | Chi carica una nuova RDO: solo il responsabile o anche i KAM? | Se e solo il responsabile, e un collo di bottiglia da 3 inserimenti al giorno (R3). Determina i ruoli | Prima del taglio 1 |
| D5 | L'azienda e su Microsoft 365 con Entra ID utilizzabile per SSO? | Determina autenticazione e canale notifiche. Se no, servono utenti locali: piu 2-3 giornate | Prima del taglio 1 |
| D6 | Dove va ospitato: Azure, on-premise, altro? Vincoli sui dati commerciali? | Determina hosting, backup e sicurezza | Prima del taglio 1 |
| D8 | Quali sono i tipi di offerta ricorrenti e le attivita standard di ciascuno? | E' il contenuto dei template di M8: senza, l'inserimento rapido non esiste | Fase 0 |
| D9 | Quante ore al giorno una persona dedica realmente alle offerte? | E' il denominatore della saturazione. Se un tecnico fa offerte al 50% e commesse al 50%, una capacita di 8 ore e falsa | Fase 0 |
| D10 | Si lavora su commessa e offerta con le stesse persone? | Se si, il portale vede meta del carico reale e la heatmap mente. Potrebbe servire una voce di carico non-offerta | Fase 0, e potenzialmente critica |

D10 e la piu importante delle tre residue: se i tecnici che sviluppano le offerte fanno anche altro
che il portale non vede, la heatmap di capacita sara sistematicamente ottimistica e il responsabile
imparera a non fidarsene. In quel caso serve almeno una voce generica di carico non-offerta,
inseribile a blocchi settimanali.

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

UX timeline, corsie e Kanban
- https://blog.logrocket.com/ux-design/reimagining-gantt-charts-ux-project-management/
- https://blog.netronic.com/how-to-improve-your-gantt-chart-user-experience
- https://pageflows.com/resources/gantt-chart-example/
- https://www.lucensoftware.com/timelines/advanced-visualization/layered
- https://demo.mobiscroll.com/react/timeline
- https://help.syncfusion.com/scheduler-sdk/react/schedule/resources
- https://javascript.daypilot.org/scheduler/
- https://www.atlassian.com/agile/kanban/wip-limits
- https://businessmap.io/kanban-resources/kanban-analytics/kanban-aging-wip
- https://kanbantool.com/kanban-wip-limits

Librerie timeline
- https://bryntum.com/blog/top-5-javascript-gantt-chart-libraries/
- https://bryntum.com/products/gantt/docs/guide/SchedulerPro/resourceviews/resourcehistogram
- https://bryntum.com/products/gantt/examples/resourceutilization/
- https://bryntum.com/store/
- https://www.capterra.com/p/176261/Bryntum/pricing/
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

---

## 14. Revisione critica del piano (rev. 3)

Rilettura avversariale del piano prima di iniziare lo sviluppo. Nove lacune trovate, in ordine di
pericolosita. Le prime quattro cambiano il codice, la prima cambia anche il processo aziendale.

### 14.1 Conformita all'art. 4 dello Statuto dei Lavoratori (bloccante, era assente)

Il portale misura saturazione per persona, WIP per persona, aging delle attivita e, con S4, le ore
effettivamente consuntivate. Sono dati sulla prestazione lavorativa di persone identificate. In
Italia questo tocca l'art. 4 della L. 300/1970 come riformato dal d.lgs. 151/2015.

Lettura della norma applicata a questo caso:

| Aspetto | Situazione | Conseguenza |
|---|---|---|
| Natura dello strumento | Strumento assegnato al lavoratore per rendere la prestazione | [Probabile] Rientra nell'esenzione dall'accordo sindacale preventivo prevista dal comma 2 |
| Uso dei dati raccolti | Ammesso a tutti i fini connessi al rapporto di lavoro | Solo a condizione che sia data adeguata informazione sulle modalita d'uso e di controllo, e che si rispetti la disciplina privacy |
| Informativa | Assente nel piano | Da produrre prima del rilascio: regolamento interno chiaro, senza formule generiche, pubblicizzato |
| Rischio se omessa | Dati inutilizzabili in sede disciplinare o giudiziale, sanzioni | Il rischio non e sullo strumento, e sull'azienda |

La funzione piu esposta e S4, il consuntivo ore: e l'unica che misura la prestazione individuale a
posteriori invece di pianificarla. Le altre pianificano, non sorvegliano.

Azioni che entrano nel piano:
- L'informativa e il regolamento interno sono prerequisito di rilascio del taglio 3, non un
  adempimento successivo. Da far validare a consulente del lavoro e DPO.
- Visibilita per ruolo: la saturazione individuale e visibile a responsabile e direzione; l'operatore
  vede la propria e il dato aggregato del team, non quello nominativo dei colleghi.
- Politica di conservazione: dati di dettaglio 24 mesi, poi solo aggregati. Da confermare col DPO.
- Nessuna classifica, nessun ranking di produttivita fra persone in interfaccia. La heatmap serve a
  distribuire il carico, non a confrontare le persone.

Nota: non sono un consulente legale. Quanto sopra e una segnalazione di rischio da far verificare,
non un parere. [Probabile]

### 14.2 Concorrenza multi-utente (era assente)

Il piano prevede autosave con 6-15 utenti sullo stesso piano, ma non dice cosa succede se due
persone modificano la stessa attivita. Con l'autosave ottimistico si perdono aggiornamenti in
silenzio, ed e il modo piu rapido per far perdere fiducia allo strumento.

Soluzione adottata: colonna `versione` su Attivita e Offerta, controllo di concorrenza ottimistico
sul salvataggio. In caso di conflitto il server rifiuta, il client ricarica la riga e mostra un
avviso non bloccante che indica chi ha modificato e cosa. Nessun lock pessimistico: bloccherebbe la
pianificazione.

### 14.3 Riconciliazione dello stato "In ritardo" (incoerenza interna)

Lo screenshot mostra "In ritardo" come valore della colonna STATO, accanto a "Non iniziata" e
"In corso". Il capitolo 6 lo definisce invece derivato. Le due cose sono incompatibili se non si
chiarisce il modello.

Modello adottato: lo stato memorizzato ha quattro valori (Non iniziata, In corso, Bloccata,
Completata). "In ritardo" e un attributo derivato che si sovrappone come badge e come colore, e puo
coesistere con In corso e con Bloccata. In interfaccia la colonna STATO mostra il derivato quando
presente, perche e l'informazione piu urgente. Questo replica il comportamento visibile nel beta
senza duplicare il dato.

### 14.4 Durata contro calendario lavorativo (regola mancante)

Lo screenshot mostra barre con segmenti tratteggiati interni: una attivita attraversa un periodo
non lavorativo. Il piano non definisce la regola, e senza regola il trascinamento produce risultati
arbitrari.

Regola adottata: la durata di una attivita e espressa in ore di lavoro, non in giorni di calendario.
Le date di inizio e fine si ricavano espandendo le ore sui giorni lavorativi della persona
assegnata, saltando weekend, festivita, chiusure aziendali e assenze individuali. Spostando
l'inizio, la fine si ricalcola con la stessa regola. Una attivita non puo iniziare in un giorno non
lavorativo: l'inizio scivola al primo giorno utile.

### 14.5 Relazione fra descrizione, progetto e offerta (ambiguita)

Nello screenshot lo stesso titolo "QUADRI ELETTRICI BT" compare su righe di gruppo diverse, con
clienti diversi (Torricelli, Cummins, Siad). Non e quindi un progetto: e una descrizione ricorrente.
La riga di gruppo identifica una singola offerta, distinta da cliente e codice commessa.

Modello adottato: la riga di gruppo e una Offerta. Il campo descrizione e testo libero con
completamento automatico sui valori gia usati, cosi resta veloce da digitare e coerente nel tempo.

### 14.6 Dati di prova a volume realistico (requisito non verificabile)

Il paragrafo 7.3 fissa 800 righe come soglia prestazionale, e il paragrafo 7.2 prevede una verifica
al terzo giorno. Nessuno dei due e verificabile senza un insieme di dati realistico.

Azione: il seed genera per default un anno di dati coerenti con D2, cioe circa 780 offerte e 2000
attivita, con distribuzione realistica su 12 persone, ferie estive e chiusure. La verifica
prestazionale usa quel seed, non tre righe di esempio.

### 14.7 Fuso orario, settimana e localizzazione (dettaglio che rompe tutto se sbagliato)

Regola adottata: tutte le date di pianificazione sono date civili senza ora, memorizzate come DATE e
interpretate in Europe/Rome. Settimane ISO 8601 con inizio lunedi, coerente con le etichette W35-W39
dello screenshot. Nessun uso di `new Date()` senza fuso esplicito nel codice di calcolo.

### 14.8 Comportamento dell'autosave in caso di errore (non definito)

Il beta mostra "Salvato". Non e definito cosa mostra quando il salvataggio fallisce, ne cosa succede
alle modifiche non salvate.

Regola adottata: tre stati espliciti dell'indicatore, cioe Salvato, Salvataggio in corso, Non
salvato con motivo e pulsante di ritentativo. Le modifiche non confermate restano visibili e
marcate, mai scartate in silenzio. Ritentativo automatico con attesa crescente.

### 14.9 Criteri di accettazione per funzione (troppo generici)

I criteri di uscita dei tagli sono descrittivi. Vanno resi misurabili funzione per funzione in fase
di sviluppo, con test automatici dove la logica e pura (calendario lavorativo, saturazione,
impilamento corsie) e con una lista di controllo manuale dove e interfaccia.

### 14.10 Cosa non cambia

Le esclusioni del paragrafo 5.4 restano valide dopo la rilettura. La selezione Must e Should non
cambia. Cambiano il modello dati (versione, regola durata), il processo di rilascio (informativa
art. 4), e la strategia di prova (seed realistico).

---

## 15. Decisioni prese in autonomia (rev. 4)

Il committente ha dato mandato di procedere decidendo. Queste sono le decisioni
che ho preso al posto suo, con il motivo. Sono tutte reversibili e vanno
confermate o corrette quando i dati reali saranno disponibili.

### 15.1 Decisioni che erano aperte

| # | Decisione presa | Motivo | Come si cambia |
|---|---|---|---|
| D4 | Possono creare una RDO responsabile e KAM | Con circa 3 richieste al giorno, concentrarle su una sola persona la rende il collo di bottiglia del sistema che dovrebbe toglierlo (rischio R3) | Ruoli, quando arriva l'autenticazione |
| D5 | Autenticazione rinviata, dietro una cucitura | Non esiste un tenant su cui provarla. Il codice non presuppone utenti locali: l'identita e gia un campo separato nell'audit | Si aggiunge il provider, non si riscrive |
| D6 | Nessuna scelta di hosting | Non e una decisione tecnica ma aziendale, e riguarda dati commerciali | Resta al committente e all'IT |
| D8 | Cinque tipi di offerta con i loro template | Servivano per far esistere M8. Sono ipotesi ricavate dallo screenshot, non dati reali | Sezione Impostazioni, Tipi e stime |
| D9 | La capacita e "ore al giorno dedicate alle offerte", modificabile per persona | Un tecnico che fa offerte mezza giornata non ha 8 ore di capacita. Usare l'orario contrattuale renderebbe la heatmap sistematicamente ottimistica | Impostazioni, Persone e capacita |
| D10 | Il carico non-offerta si rappresenta come indisponibilita ricorrente a ore | Non serve un modello separato: sottrarre ore alla capacita e esattamente cio che serve, e si vede nella heatmap come qualunque altra assenza | Impostazioni, Calendario e assenze |

### 15.2 Decisioni di prodotto emerse costruendo

| # | Decisione | Motivo |
|---|---|---|
| 15.2.1 | Assegnare una attivita assegna anche i suoi successori ancora liberi, alla stessa persona | Senza questa regola una richiesta con quattro attivita richiedeva quattro trascinamenti. Nel processo offerta la sequenza la svolge quasi sempre la stessa persona. Riassegnare un singolo anello resta possibile trascinandolo altrove |
| 15.2.2 | La coda "Da assegnare" mostra una riga per offerta, non per attivita | Conseguenza della precedente: elencare attivita che verranno assegnate insieme gonfia la coda senza aggiungere decisioni |
| 15.2.3 | Lo scorrimento della catena conserva il margine esistente fra le attivita | Se fra analisi e sviluppo c'erano due giorni di stacco, dopo lo spostamento ce ne sono ancora due. Il pianificatore ritrova la forma che aveva costruito |
| 15.2.4 | Il ridimensionamento di una barra invia la nuova data di fine, non le ore | Il client non conosce il calendario della persona: indovinare otto ore al giorno sarebbe sbagliato per chi ne fa quattro. Le ore le ricava il server dalla capacita reale |
| 15.2.5 | Le date non arrivano mai dal client | Il client dichiara l'intenzione (chi, da quando), il server calcola. Altrimenti due browser con dati di calendario diversi produrrebbero piani diversi |
| 15.2.6 | Il controllo di concorrenza e sulla sola radice della catena | I successori sono conseguenza della modifica, non modifiche indipendenti. Le loro versioni vengono comunque incrementate, cosi chi li stia modificando riceve un conflitto |
| 15.2.7 | I template dei tipi di offerta sono in sola lettura in Impostazioni | Cambiare quali attivita nascono da una richiesta e una decisione di processo, non una regolazione da fare al volo fra due telefonate |
| 15.2.8 | La saturazione considera tutto il lavoro pianificato, non solo quello filtrato | Nascondere meta del carico renderebbe la heatmap una bugia |
| 15.2.9 | Il sistema rifiuta di collocare lavoro oltre 45 giorni dopo la data richiesta | Difetto trovato sui dati di prova: una persona con capacita netta zero faceva slittare il lavoro di dieci mesi, in silenzio. Il motore era corretto, il prodotto no: oltre quella soglia non e pianificazione, e occultamento |
| 15.2.10 | Il colore del carico usa i tre passi di stato verde, ambra e rosso del palette di riferimento | Superano separazione per daltonismo e soglia a visione normale. L'ambra resta sotto il rapporto 3:1 su bianco, quindi ogni marca ambra porta sempre un numero visibile e la dashboard offre una vista tabellare: il colore non porta mai il significato da solo |
| 15.2.11 | La dashboard usa una griglia per il carico, tabelle per gli elenchi e una cifra guida per i tempi | Il lavoro del lettore decide la forma. Un istogramma per i tempi sarebbe stato un grafico a una barra: il numero e il grafico |
| 15.2.12 | Una revisione crea una attivita agganciata all'ultima, alla stessa persona, e riporta l'offerta in revisione | Chi ha fatto l'offerta e chi puo rivederla in meno tempo. L'offerta esce dal campione del tempo di preparazione finche non e riconsegnata: l'orologio riparte, ed e corretto che sia cosi |
| 15.2.13 | Il consuntivo ore (S4) NON viene costruito finche non esistono informativa e regolamento art. 4 | E' l'unica funzione che misura a posteriori la prestazione individuale. Costruirla e lasciarla spenta sarebbe stato piu comodo, ma la tentazione di accenderla senza copertura e reale. Vedi par. 14.1 |
| 15.2.14 | Il TESTO della barra porta cliente e descrizione dell'offerta, non il tipo di attivita | Segnalazione del committente, e aveva ragione: il tipo e gia codificato dal colore, quindi scriverlo era una ripetizione, e nella vista per risorsa l'identita dell'offerta spariva dentro il tooltip. Ora si legge a colpo d'occhio di chi e il lavoro |
| 15.2.15 | Quando la barra e troppo stretta l'etichetta esce a destra, ma solo se c'e spazio libero fino alla barra successiva | Un'etichetta sovrapposta a un'altra barra e peggio di nessuna etichetta. Con barre da mezza giornata a 22 pixel al giorno, il testo dentro non ci sta mai |
| 15.2.16 | Disfare una assegnazione riporta l'attivita in coda senza toccare i successori | Serve per annullare un rilascio sbagliato, e da solo per togliere un lavoro dalle mani sbagliate. Spostare anche i successori significherebbe muovere lavoro che qualcun altro ha gia in mano |
| 15.2.17 | L'identita arriva dalla piattaforma, il RUOLO dal database | Cosi i permessi li amministra l'azienda in Impostazioni, non chi configura i gruppi della directory. Cambiare un ruolo non richiede un ticket all'IT |
| 15.2.18 | Entra ID si integra tramite l'autenticazione della piattaforma Azure, non con un flusso OIDC nell'applicazione | La piattaforma verifica il token e inietta `x-ms-client-principal`; le richieste esterne non possono impostare quelle intestazioni. E' meno codice da mantenere e meno superficie da sbagliare |
| 15.2.19 | Il default di `MODALITA_AUTENTICAZIONE` e la modalita meno privilegiata | Un errore di configurazione non deve far credere all'applicazione di essere protetta da Entra ID quando non lo e |
| 15.2.20 | Chi non puo vedere un dato non lo riceve | La restrizione sta al confine dei dati, non nell'interfaccia. Nasconderlo a schermo lasciandolo nella risposta significherebbe non averlo nascosto |
| 15.2.21 | Nemmeno il responsabile registra il consuntivo ore al posto di altri | Sarebbe un dato sulla prestazione altrui inserito da un terzo, e non e cio che serve a tarare le stime. E' la regola che tiene la funzione dentro il perimetro dell'art. 4 |
| 15.2.22 | Una notifica parte solo se c'e qualcosa da fare | Una notifica che arriva tutti i giorni viene archiviata senza leggerla. Chi non ha nulla non riceve nulla |
| 15.2.23 | Il canale notifiche predefinito scrive nel registro del server | Non e un segnaposto: permette di verificare chi verrebbe disturbato e perche, senza spedire niente a nessuno finche non ci sono le credenziali |
| 15.2.24 | La rotta del digest resta chiusa senza chiave configurata | Un endpoint che spedisce posta a tutta la divisione non deve essere aperto per dimenticanza |
| 15.2.25 | Lo schema impone al massimo un successore e un predecessore per attivita | Il par. 5.4 esclude il grafo delle dipendenze, e il codice percorre una catena lineare. Lo schema pero permetteva diramazioni che il codice avrebbe ignorato in silenzio: un'invariante assunta e non imposta. Ora due vincoli di unicita rendono il grafo, per costruzione, una unione di cammini semplici. Non si e costruito uno scheduler su grafo aciclico: si e reso impossibile cio che il codice non gestisce |

### 15.4 Sul consuntivo ore e l'art. 4

Avevo deciso di non costruirlo finche non esistessero informativa e regolamento.
Il committente ha confermato di procedere. L'ho costruito, e insieme ho prodotto
la bozza di informativa in `docs/02-informativa-art4.md`, cosi il prerequisito e
azionabile invece che bloccante.

Le salvaguardie che avevo progettato sono nel codice, non nelle intenzioni:
lo registra solo chi ha svolto il lavoro, il campo arriva precompilato con la
stima, ogni scrittura finisce nel registro con l'autore, i consuntivi altrui in
forma nominativa li vedono solo responsabile e direzione, e in nessun punto del
portale esiste una classifica fra persone.

Resta vero, e va detto: l'informativa va validata da un consulente e resa nota
prima del rilascio. Il codice non puo farlo al posto dell'azienda.

### 15.3 Cosa resta scoperto e va deciso dal committente

1. I numeri reali di D8, D9 e D10: tipi di offerta effettivi, ore davvero
   dedicate alle offerte, carico non-offerta per persona. Lo strumento li
   accetta gia; senza i valori veri la heatmap e plausibile ma non vera.
2. Hosting e autenticazione (D5, D6).
3. Informativa e regolamento art. 4 (par. 14.1), prerequisito di rilascio.
