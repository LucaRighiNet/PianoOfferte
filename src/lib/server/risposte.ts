import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import {
  AttivitaInesistente,
  ConflittoDiVersione,
  PianificazioneRifiutata,
} from './pianificazione';

/** Traduzione uniforme degli errori di dominio in risposte HTTP. */
export function rispostaDaErrore(errore: unknown): NextResponse {
  if (errore instanceof ConflittoDiVersione) {
    return NextResponse.json(
      { errore: errore.message, versioneAttuale: errore.versioneAttuale },
      { status: 409 },
    );
  }
  if (errore instanceof AttivitaInesistente) {
    return NextResponse.json({ errore: errore.message }, { status: 404 });
  }
  if (errore instanceof PianificazioneRifiutata) {
    return NextResponse.json(
      { errore: errore.message, problemi: errore.problemi },
      { status: 422 },
    );
  }
  if (errore instanceof ZodError) {
    return NextResponse.json(
      { errore: 'Dati non validi', dettaglio: errore.flatten() },
      { status: 400 },
    );
  }
  console.error('Errore non gestito:', errore);
  return NextResponse.json({ errore: 'Errore interno' }, { status: 500 });
}

/** Legge e valida il corpo JSON, distinguendo JSON malformato da dati invalidi. */
export async function leggiCorpo<T>(
  richiesta: Request,
  schema: ZodSchema<T>,
): Promise<{ ok: true; dati: T } | { ok: false; risposta: NextResponse }> {
  let grezzo: unknown;
  try {
    grezzo = await richiesta.json();
  } catch {
    return {
      ok: false,
      risposta: NextResponse.json({ errore: 'Corpo della richiesta non valido' }, { status: 400 }),
    };
  }
  const analisi = schema.safeParse(grezzo);
  if (!analisi.success) {
    return {
      ok: false,
      risposta: NextResponse.json(
        { errore: 'Dati non validi', dettaglio: analisi.error.flatten() },
        { status: 400 },
      ),
    };
  }
  return { ok: true, dati: analisi.data };
}
