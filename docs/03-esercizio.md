# Messa in esercizio

Riferimento: `docs/00-analisi-e-piano.md`. Decisione D6 del piano.

## 1. Prerequisiti

| Requisito | Nota |
|---|---|
| Node 22 o superiore | |
| PostgreSQL 16 o superiore | Con backup: il portale e la fonte del piano, non una copia |
| Un fronte che autentichi con Microsoft Entra ID | Vedi par. 3. Senza, NON si mette in esercizio |
| Informativa art. 4 validata e resa nota | Vedi `docs/02-informativa-art4.md`. E' un prerequisito, non un adempimento successivo |

## 2. Variabili d'ambiente

| Variabile | Obbligatoria | Valore |
|---|---|---|
| `DATABASE_URL` | Si | Connessione PostgreSQL |
| `TZ` | Si | `Europe/Rome` |
| `MODALITA_AUTENTICAZIONE` | Si | `easyauth` in esercizio |
| `CHIAVE_NOTIFICHE` | Per le notifiche | Segreto lungo e casuale |
| `CANALE_NOTIFICHE` | No | `registro` oppure `graph` |
| `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `GRAPH_MITTENTE` | Con `graph` | Tutte e quattro, altrimenti l'avvio delle notifiche fallisce dicendo quale manca |

## 3. Il rischio residuo piu importante

L'applicazione, in modalita `easyauth`, si fida dell'intestazione
`x-ms-client-principal`. Quella fiducia e giustificata SOLO se davanti c'e la
piattaforma che la inietta: l'autenticazione integrata di Azure App Service o
Container Apps rimuove le intestazioni omonime che arrivano dall'esterno.

Se l'applicazione venisse esposta direttamente, senza quel fronte, chiunque
potrebbe costruire quell'intestazione e presentarsi come chiunque.

Conseguenza operativa, non negoziabile:

- il contenitore non deve essere raggiungibile se non attraverso il fronte
  autenticante;
- se si cambia piattaforma, si verifica che il nuovo fronte rimuova le
  intestazioni in ingresso prima di iniettare le proprie.

Contromisura gia nel codice: in produzione la modalita `sviluppo` viene
rifiutata. Serve a impedire il caso opposto, cioe un rilascio senza
autenticazione per dimenticanza. Non protegge da un rilascio senza fronte in
modalita `easyauth`: quello lo garantisce l'infrastruttura.

## 3-bis. Esito della revisione di sicurezza

Revisione manuale di quanto introdotto con autenticazione, permessi, segreti e
rotte pubbliche.

| Punto | Esito |
|---|---|
| Falsificazione dell'intestazione di identita | Rischio reale se l'applicazione e esposta senza il fronte autenticante. Vedi par. 3: e una garanzia dell'infrastruttura |
| Rilascio per errore senza autenticazione | Chiuso: in produzione la modalita sviluppo e rifiutata e la pagina lo spiega. Riabilitabile solo con `CONSENTI_ACCESSO_SVILUPPO=si` |
| Confronto della chiave delle notifiche | Chiuso: confronto a tempo costante |
| Aggiramento dei permessi via API | Chiuso: ogni rotta che scrive richiede utente e verifica il permesso; le restrizioni di lettura sono al confine dei dati |
| Elevazione di privilegio dai claim | Chiuso: il ruolo viene dal database, i claim portano solo l'identita |
| Iniezione SQL | Non applicabile: tutte le query passano da Prisma con parametri |
| Validazione degli ingressi | Chiuso: ogni corpo di richiesta e validato con uno schema |
| Contenuto dei digest nei log | Accettato: con `CANALE_NOTIFICHE=registro` nomi cliente e descrizioni finiscono nel log del server. Da tenere presente nella conservazione dei log |
| Limitazione di frequenza | Assente. Accettabile dietro autenticazione aziendale; da rivedere se il portale venisse esposto altrove |

## 4. Passi del rilascio

```bash
npm ci
npx prisma generate
npm run db:deploy      # applica le migrazioni versionate
npm run build
npm run start
```

Il primo rilascio richiede di censire le persone. Finche non esistono, chi
accede e autenticato ma non riconosciuto e viene informato di chiedere
l'inserimento. Le anagrafiche si popolano da Impostazioni.

## 5. Notifiche

Il digest si invia chiamando una volta al giorno:

```
POST /api/notifiche/digest
x-chiave-notifiche: <CHIAVE_NOTIFICHE>
```

Da uno scheduler esterno: Azure Logic Apps, un job del sistema, o simili.
Risponde con quante persone ha considerato, quanti messaggi ha spedito e
quante persone non avevano nulla da segnalare.

Con `CANALE_NOTIFICHE=registro` non spedisce nulla e scrive nel log: e il modo
per verificare chi verrebbe disturbato e perche, prima di attivare la posta.

## 6. Conservazione e cancellazione

I tempi proposti sono nel par. 7 di `docs/02-informativa-art4.md` e vanno
confermati dal responsabile della protezione dei dati. Il portale non cancella
nulla da solo: la politica di conservazione va realizzata con un job che il
committente deve decidere di volere.

## 6-bis. Prestazioni: cosa e stato misurato e ottimizzato

Misure sul seme di prova (520 offerte, 1222 attivita), pagina di pianificazione,
compilazione di produzione. Il confronto prima/dopo e stato rifatto sulla stessa
macchina e sugli stessi dati, avviando le due compilazioni una dopo l'altra: le
misure prese in momenti diversi non sono confrontabili.

Peso della risposta HTML, misurato con `curl | wc -c`. E' un numero
deterministico: si ripete identico a ogni richiesta.

| Livello di zoom | Peso prima | Peso dopo | Variazione |
|---|---|---|---|
| Due settimane | 1.281.114 byte | 398.302 byte | -68,9% |
| Due mesi (predefinito) | 1.281.118 byte | 872.437 byte | -31,9% |
| Trimestre | 1.281.120 byte | 1.165.818 byte | -9,0% |

Prima, il peso era identico ai tre zoom perche la finestra caricata era fissa a
90 giorni: si trasmettevano gli stessi dati sia per mostrarne due settimane sia
per mostrarne un trimestre.

Tempi, mediana su piu giri di `verifica:ui` (tre prima, cinque dopo). Soglie del
par. 7.3 del piano: 1500 e 150 ms.

| Metrica | Prima (mediana, intervallo) | Dopo (mediana, intervallo) | Variazione |
|---|---|---|---|
| Primo caricamento utile | 1193 ms (1168-1239) | 1196 ms (1091-1269) | Nessuna, dentro il rumore |
| Cambio filtro | 79,3 ms (75,5-80,9) | 64,8 ms (62,0-94,1) | Circa -18% |

Il caricamento NON e migliorato, e va detto: la misura e su `localhost`, dove
trasferire 400 KB in meno costa quasi nulla e il tempo e dominato dal render sul
server e dall'idratazione delle righe visibili, che sono le stesse di prima. Il
peso risparmiato si paga su rete reale: a 10 Mbit/s effettivi, i 409 KB in meno
allo zoom normale valgono circa 0,3 s, e gli 883 KB in meno allo zoom su due
settimane circa 0,7 s. Su collegamento in sede conta poco, da VPN o da rete
mobile conta.

Il cambio filtro migliora perche e lavoro del browser, non trasferimento: meno
nodi e meno attributi da ricalcolare. E' l'unico guadagno che si vede anche in
locale.

Un giro singolo non basta per concludere: sulla stessa compilazione il primo
caricamento varia di circa il 15% fra un giro e l'altro. Un confronto fra due
misure singole prese in momenti diversi ha prodotto, in questo progetto, una
differenza del tutto inventata.

Dove NON era il costo, contro le attese:

| Sospetto | Misura | Esito |
|---|---|---|
| Interrogazioni al database | 1,4 ms di esecuzione | Non e un collo di bottiglia. Nessun indice aggiunto |
| Griglia dei giorni a elementi | 819 elementi, 180 KB | Reale ma minore: il 14% |
| Attributi di stile ripetuti | 2263 attributi, 250 KB | Il costo principale dell'HTML |
| Finestra di dati caricata | 658 attivita per mostrarne 254 | Il costo principale dell'idratazione |

Interventi, in ordine di resa: la finestra caricata segue lo zoom invece di
essere fissa; forma e stati di barre e celle di carico sono passati alle classi,
lasciando in linea solo posizione, dimensione e colore; la griglia dei giorni e
diventata uno sfondo; il nome del tipo di attivita non viaggia piu su ogni
attivita, perche il client ha gia la tabella per identificativo.

## 7. Cosa sorvegliare dopo il rilascio

| Segnale | Dove | Perche |
|---|---|---|
| Tempo del primo caricamento | `npm run verifica:ui` | E' la metrica piu vicina alla soglia: con 900 attivita nella finestra il margine si e ridotto |
| Saturazione media | Dashboard | Se resta stabilmente sopra il 100% la capacita configurata e sbagliata, non la divisione |
| Righe con carico assurdo | Dashboard | Un valore oltre il 500% indica dati di capacita errati, non sovraccarico |
| Stime contro consuntivi | Consuntivo ore | Se divergono sistematicamente, vanno cambiate le stime predefinite in Impostazioni |
| Digest che nessuno legge | Comportamento | Se le notifiche vengono ignorate, sono troppe o sbagliate: si restringe, non si insiste |
