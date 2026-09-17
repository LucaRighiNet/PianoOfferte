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
pagina.on('requestfailed', (r) => risorseNonCaricate.push(`${r.url()} (${r.failure()?.errorText})`));
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

const esito = {
  msCaricamento,
  msCambioFiltro: Math.round(msFiltro * 10) / 10,
  barreDisegnate: barre,
  barreRaggiungibili: cliccabili,
  bannerTroncamentoVistaOfferta: troncamento > 0,
  problemi,
};
globalThis.console.log(JSON.stringify(esito, null, 2));
exit(problemi.length === 0 ? 0 : 1);
