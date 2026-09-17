import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eDataCivile, type DataCivile } from '@/lib/data/dataCivile';
import { pianificaAttivita } from '@/lib/server/pianificazione';
import { leggiCorpo, rispostaDaErrore } from '@/lib/server/risposte';
import { richiediPermesso, richiediUtente } from '@/lib/auth/sessione';
import { puoPianificare } from '@/lib/auth/permessi';

/**
 * Assegnazione, spostamento e ridimensionamento di una attivita (M2, M5).
 *
 * Il client non invia date di fine: invia l'intenzione (chi, da quando, quante
 * ore) e il server calcola con il calendario reale, riprogrammando la catena.
 */

const Corpo = z
  .object({
    versione: z.number().int().nonnegative(),
    personaId: z.string().min(1).nullable().optional(),
    dataInizio: z
      .string()
      .refine(eDataCivile, { message: 'Formato data atteso YYYY-MM-DD' })
      .optional(),
    stimaOre: z.number().positive().max(2000).optional(),
    dataFine: z
      .string()
      .refine(eDataCivile, { message: 'Formato data atteso YYYY-MM-DD' })
      .optional(),
  })
  .refine(
    (c) =>
      c.personaId !== undefined ||
      c.dataInizio !== undefined ||
      c.stimaOre !== undefined ||
      c.dataFine !== undefined,
    { message: 'Indicare almeno una modifica fra risorsa, date e stima' },
  );

export async function PATCH(
  richiesta: Request,
  contesto: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await contesto.params;
  const letto = await leggiCorpo(richiesta, Corpo);
  if (!letto.ok) return letto.risposta;

  try {
    const utente = await richiediUtente();
    richiediPermesso(
      puoPianificare(utente.ruolo),
      'Solo il responsabile di divisione puo assegnare e spostare il lavoro',
    );

    const esito = await pianificaAttivita({
      attivitaId: id,
      versione: letto.dati.versione,
      utenteId: utente.id,
      ...(letto.dati.personaId !== undefined ? { personaId: letto.dati.personaId } : {}),
      ...(letto.dati.dataInizio !== undefined
        ? { dataInizio: letto.dati.dataInizio as DataCivile }
        : {}),
      ...(letto.dati.stimaOre !== undefined ? { stimaOre: letto.dati.stimaOre } : {}),
      ...(letto.dati.dataFine !== undefined
        ? { dataFine: letto.dati.dataFine as DataCivile }
        : {}),
    });
    return NextResponse.json(esito);
  } catch (errore) {
    return rispostaDaErrore(errore);
  }
}
