/**
 * Sostituto di `server-only` nei test.
 *
 * Il pacchetto vero solleva un errore se importato fuori da un componente
 * server, e in Vitest non esiste quel contesto. Si neutralizza qui invece di
 * togliere la guardia dai moduli: la protezione contro l'import accidentale
 * lato client resta valida nella compilazione reale.
 */
export {};
