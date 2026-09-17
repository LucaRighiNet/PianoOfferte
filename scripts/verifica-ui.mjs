/**
 * Verifica end-to-end dell'interfaccia contro un server gia avviato.
 *
 * Controlla che la pagina si carichi, che non ci siano errori in console, e che
 * i requisiti misurabili del par. 7.3 del piano siano rispettati:
 * caricamento sotto 1500 ms, cambio filtro sotto 150 ms.
 *
 * Uso: npm run start & ; node scripts/verifica-ui.mjs [--immagini cartella]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { argv, exit } from 'node:process';

const SOGLIA_CARICAMENTO_MS = 1500;
const SOGLIA_FILTRO_MS = 150;
const INDIRIZZO = 'http://localhost:3000/pianificazione';

const indiceCartella = argv.indexOf('--immagini');
const cartella = indiceCartella === -1 ? null : argv[indiceCartella + 1];
if (cartella) await mkdir(cartella, { recursive: true });

const problemi = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pagina = await browser.newPage({ viewport: { width: 1600, height: 900 } });

pagina.on('console', (m) => {
  if (m.type() === 'error') problemi.push(`console: ${m.text()}`);
});
pagina.on('pageerror', (e) => problemi.push(`eccezione in pagina: ${e.message}`));

// Un chunk statico che non si carica impedisce l'idratazione di React: la
// pagina resta visibile ma inerte, e ogni controllo successivo fallisce per il
// motivo sbagliato. Va riconosciuto per quello che e.
const risorseNonCaricate = [];
pagina.on('requestfailed', (r) => {
  const motivo = r.failure()?.errorText ?? '';
  // Un prefetch speculativo annullato dalla navigazione non e un guasto: il
  // browser lo interrompe di proposito. Tutto il resto conta.
  if (motivo.includes('ERR_ABORTED')) return;
  risorseNonCaricate.push(`${r.url()} (${motivo})`);
});
pagina.on('response', (r) => {
  if (r.status() >= 400) risorseNonCaricate.push(`${r.url()} -> HTTP ${r.status()}`);
});

const avvio = Date.now();
await pagina.goto(INDIRIZZO, { waitUntil: 'networkidle' });
const msCaricamento = Date.now() - avvio;

async function scatta(nome) {
  if (!cartella) return;
  await pagina.screenshot({ path: `${cartella}/${nome}.png` });
}

/**
 * React ha agganciato i gestori? Non si deduce da attributi interni, che
 * cambiano fra versioni: si prova a interagire davvero. Il tema e la prova piu
 * semplice perche il suo effetto e osservabile su un attributo del documento.
 */
async function verificaIdratazione() {
  const prima = await pagina.getAttribute('html', 'data-tema');
  await pagina.locator('button[title="Cambia tema"]').click();
  await pagina.waitForTimeout(200);
  const dopo = await pagina.getAttribute('html', 'data-tema');
  if (prima === dopo) return false;
  // Si ripristina lo stato iniziale per non alterare gli scatti successivi.
  await pagina.locator('button[title="Cambia tema"]').click();
  await pagina.waitForTimeout(200);
  return true;
}

async function premiPulsante(testo) {
  await pagina.locator('button', { hasText: new RegExp(`^${testo}$`) }).first().click();
  await pagina.waitForTimeout(250);
}

const msFiltro = await pagina.evaluate(async () => {
  const bersaglio = [...globalThis.document.querySelectorAll('button')].find(
    (b) => b.textContent?.trim() === 'Tutte',
  );
  if (!bersaglio) return -1;
  const inizio = globalThis.performance.now();
  bersaglio.click();
  await new Promise((risolvi) =>
    globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(risolvi)),
  );
  return globalThis.performance.now() - inizio;
});

const idratata = await verificaIdratazione();
if (!idratata) problemi.push('la pagina non risulta idratata: i gestori React non sono attivi');
if (risorseNonCaricate.length > 0) {
  problemi.push(`risorse non caricate: ${risorseNonCaricate.join(', ')}`);
}

const barre = await pagina.locator('button[aria-label]').count();

// Regressione: i contenitori a tutta riga coprivano le barre della stessa
// corsia, rendendo cliccabile solo l'ultima. Si verifica che piu barre
// consecutive ricevano davvero il click.
const cliccabili = await pagina.evaluate(() => {
  // Si esaminano solo le barre il cui centro cade dentro l'area di scorrimento
  // visibile: una barra scorsa fuori schermo e legittimamente non cliccabile.
  const contenitore = globalThis.document.querySelector('.overflow-auto');
  if (!contenitore) return { esaminate: 0, raggiungibili: 0 };
  const zona = contenitore.getBoundingClientRect();
  let esaminate = 0;
  let raggiungibili = 0;
  for (const b of globalThis.document.querySelectorAll('button[aria-label]')) {
    const r = b.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    if (cx < zona.left || cx > zona.right || cy < zona.top || cy > zona.bottom) continue;
    esaminate += 1;
    const sopra = globalThis.document.elementFromPoint(cx, cy);
    if (sopra === b || b.contains(sopra)) raggiungibili += 1;
  }
  return { esaminate, raggiungibili };
});

await scatta('vista-risorsa');

await premiPulsante('Per offerta');
const troncamento = await pagina.locator('[data-prova="troncamento"]').count();
await scatta('vista-offerta');

await premiPulsante('Per risorsa');
await pagina.locator('button[title="Cambia tema"]').click();
await pagina.waitForTimeout(250);
await scatta('vista-scura');

// Cambio stato a un click. Si sceglie una barra lontana dall'intestazione
// fissa, altrimenti il click finirebbe sull'intestazione.
const barreCliccabili = pagina.locator('button[aria-label]');
const quante = await barreCliccabili.count();
await barreCliccabili.nth(Math.min(30, Math.max(0, quante - 1))).click();
await pagina.waitForTimeout(150);
const dettaglioVisibile = await pagina.locator('text=Stato:').count();
await pagina.keyboard.press('4');
await pagina.waitForTimeout(700);
const salvato = await pagina.locator('[data-prova="salvataggio"]', { hasText: 'Salvato' }).count();

// --- Creazione di una nuova RDO (M8) -------------------------------------
const codiceProva = `Prova automatica ${Date.now()}`;
const codaPrima = Number((await pagina.textContent('aside header span')) ?? '0');

await pagina.locator('button', { hasText: '+ Nuova RDO' }).click();
await pagina.waitForTimeout(300);
const moduloAperto = await pagina.locator('text=Nuova richiesta di offerta').count();

if (moduloAperto > 0) {
  await pagina.getByPlaceholder('Quadri elettrici BT').fill(codiceProva);
  await pagina.getByPlaceholder('Cummins').fill('Cliente Prova Automatica');
  await pagina.locator('button', { hasText: 'Crea richiesta' }).click();
  await pagina.waitForTimeout(1500);
}
const avvisoCreazione = await pagina.locator('[data-prova="avviso"]').textContent().catch(() => '');
const codaDopo = Number((await pagina.textContent('aside header span')) ?? '0');

// --- Assegnazione per trascinamento dalla coda (M5) ----------------------
async function centro(elemento) {
  const r = await elemento.boundingBox();
  if (!r) return null;
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

const primaVoceCoda = pagina.locator('aside ul li button').first();
const corsia = pagina.locator('[data-corsia-persona]').first();
const partenza = await centro(primaVoceCoda);
const arrivo = await centro(corsia);

let assegnazioneRiuscita = false;
if (partenza && arrivo) {
  await pagina.mouse.move(partenza.x, partenza.y);
  await pagina.mouse.down();
  await pagina.mouse.move(partenza.x - 40, partenza.y, { steps: 5 });
  await pagina.mouse.move(arrivo.x, arrivo.y, { steps: 10 });
  await pagina.mouse.up();
  await pagina.waitForTimeout(2000);
  const codaFinale = Number((await pagina.textContent('aside header span')) ?? '0');
  assegnazioneRiuscita = codaFinale < codaDopo;
}

// --- Spostamento di una barra (M2) ---------------------------------------
const barraDaSpostare = pagina.locator('[data-corsia-persona] button[aria-label]').nth(3);
const posizionePrima = await barraDaSpostare.boundingBox();
let spostamentoRiuscito = false;
if (posizionePrima) {
  const da = { x: posizionePrima.x + posizionePrima.width / 2, y: posizionePrima.y + posizionePrima.height / 2 };
  await pagina.mouse.move(da.x, da.y);
  await pagina.mouse.down();
  await pagina.mouse.move(da.x + 60, da.y, { steps: 8 });
  await pagina.mouse.up();
  await pagina.waitForTimeout(2000);
  const indicatore = await pagina.locator('[data-prova="salvataggio"]').textContent().catch(() => '');
  spostamentoRiuscito = indicatore === 'Salvato';
}

await scatta('dopo-trascinamento');

// --- Impostazioni (M4) ----------------------------------------------------
await pagina.goto('http://localhost:3000/impostazioni', { waitUntil: 'networkidle' });
const righePersone = await pagina.locator('tbody tr').count();

// Modifica della capacita: si salva alla perdita di fuoco, non a ogni tasto.
const campoCapacita = pagina.locator('tbody tr').first().locator('input[type="number"]').first();
const capacitaOriginale = await campoCapacita.inputValue();
await campoCapacita.fill('5.5');
await campoCapacita.blur();
await pagina.waitForTimeout(1200);
const capacitaSalvata =
  (await pagina.locator('[role="status"]').textContent().catch(() => '')) === 'Salvato';
// Ripristino, cosi la verifica non lascia il database alterato.
await campoCapacita.fill(capacitaOriginale);
await campoCapacita.blur();
await pagina.waitForTimeout(800);

// Inserimento e cancellazione di una assenza.
await pagina.locator('button', { hasText: 'Calendario e assenze' }).click();
await pagina.waitForTimeout(400);
const assenzePrima = await pagina.locator('tbody tr').count();

// La voce porta una nota irripetibile, cosi la si ritrova per eliminarla:
// uno script di verifica che lascia residui in banca dati e esso stesso un
// difetto, e le esecuzioni ripetute smetterebbero di essere confrontabili.
const notaProva = `verifica-${Date.now()}`;
await pagina.locator('form input[type="text"]').last().fill(notaProva);
await pagina.locator('button', { hasText: 'Aggiungi' }).click();
await pagina.waitForTimeout(1200);
const assenzeDopo = await pagina.locator('tbody tr').count();

let assenzaEliminata = false;
const rigaProva = pagina.locator('tbody tr', { hasText: notaProva });
if ((await rigaProva.count()) > 0) {
  await rigaProva.first().locator('button', { hasText: 'Elimina' }).click();
  await pagina.waitForTimeout(1200);
  assenzaEliminata =
    (await pagina.locator('tbody tr', { hasText: notaProva }).count()) === 0 &&
    (await pagina.locator('tbody tr').count()) === assenzePrima;
}
await scatta('impostazioni');

// --- Dashboard (S1) -------------------------------------------------------
await pagina.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
const cifreDashboard = await pagina.evaluate(() =>
  [...globalThis.document.querySelectorAll('main > div:first-child > div')].map((d) =>
    (d.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
  ),
);
const righeCarico = await pagina.locator('table tbody tr').first().locator('td').count();

// La vista tabellare e il rimedio obbligato per i colori di stato sotto 3:1:
// se manca, il colore porterebbe il significato da solo.
await pagina.locator('button', { hasText: 'Tabella' }).click();
await pagina.waitForTimeout(300);
const vistaTabellare = (await pagina.locator('text=allocate / disponibili').count()) > 0;
await scatta('dashboard');

// Nessuna percentuale assurda: se compare, i dati o il calcolo sono sbagliati.
await pagina.locator('button', { hasText: 'Griglia' }).click();
await pagina.waitForTimeout(300);
const percentuali = await pagina.evaluate(() =>
  [...globalThis.document.querySelectorAll('table tbody td div')]
    .map((d) => Number((d.textContent ?? '').replace('%', '')))
    .filter((n) => Number.isFinite(n)),
);
const massimoCarico = percentuali.length === 0 ? 0 : Math.max(...percentuali);

await browser.close();

if (msCaricamento > SOGLIA_CARICAMENTO_MS) {
  problemi.push(`caricamento ${msCaricamento} ms oltre la soglia di ${SOGLIA_CARICAMENTO_MS} ms`);
}
if (msFiltro < 0) problemi.push('pulsante di filtro non trovato');
else if (msFiltro > SOGLIA_FILTRO_MS) {
  problemi.push(`cambio filtro ${msFiltro.toFixed(1)} ms oltre la soglia di ${SOGLIA_FILTRO_MS} ms`);
}
if (barre === 0) problemi.push('nessuna barra disegnata');
if (cliccabili.esaminate > 0 && cliccabili.raggiungibili < cliccabili.esaminate) {
  problemi.push(
    `${cliccabili.esaminate - cliccabili.raggiungibili} barre su ${cliccabili.esaminate} risultano coperte da un altro elemento`,
  );
}
if (dettaglioVisibile === 0) problemi.push('il dettaglio non compare alla selezione di una barra');
if (salvato === 0) problemi.push('il cambio di stato da tastiera non ha confermato il salvataggio');

if (moduloAperto === 0) problemi.push('il modulo Nuova RDO non si apre');
else if (codaDopo <= codaPrima) problemi.push('la nuova RDO non e finita nella coda Da assegnare');
if (!assegnazioneRiuscita) {
  problemi.push('il trascinamento dalla coda non ha assegnato la richiesta');
}
if (!spostamentoRiuscito) problemi.push('lo spostamento di una barra non ha confermato il salvataggio');
if (righePersone === 0) problemi.push('la schermata Impostazioni non elenca le persone');
if (!capacitaSalvata) problemi.push('la modifica della capacita non ha confermato il salvataggio');
if (assenzeDopo <= assenzePrima) problemi.push('l inserimento di una assenza non ha aggiunto righe');
else if (!assenzaEliminata) problemi.push('l eliminazione di una assenza non ha rimosso la riga');

if (cifreDashboard.length !== 4) problemi.push('la dashboard non mostra quattro indicatori');
if (righeCarico === 0) problemi.push('la griglia di carico e vuota');
if (!vistaTabellare) {
  problemi.push('manca la vista tabellare del carico, richiesta dai colori di stato');
}
if (massimoCarico > 500) {
  problemi.push(`carico massimo ${massimoCarico}%: dati o calcolo non plausibili`);
}

const esito = {
  msCaricamento,
  msCambioFiltro: Math.round(msFiltro * 10) / 10,
  barreDisegnate: barre,
  barreRaggiungibili: cliccabili,
  bannerTroncamentoVistaOfferta: troncamento > 0,
  moduloRdoApre: moduloAperto > 0,
  codaDaAssegnare: { prima: codaPrima, dopoCreazione: codaDopo },
  avvisoCreazione: (avvisoCreazione ?? '').trim().slice(0, 80),
  assegnazioneRiuscita,
  spostamentoRiuscito,
  impostazioni: { righePersone, capacitaSalvata, assenzePrima, assenzeDopo, assenzaEliminata },
  dashboard: { indicatori: cifreDashboard.length, vistaTabellare, massimoCarico },
  problemi,
};
globalThis.console.log(JSON.stringify(esito, null, 2));
exit(problemi.length === 0 ? 0 : 1);
