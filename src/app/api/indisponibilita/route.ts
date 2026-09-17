import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { aDateUtc, confronta, eDataCivile, type DataCivile } from '@/lib/data/dataCivile';
import { leggiCorpo, rispostaDaErrore } from '@/lib/server/risposte';
import { richiediPermesso, richiediUtente } from '@/lib/auth/sessione';
import { puoModificareImpostazioni } from '@/lib/auth/permessi';

/**
 * Ferie, chiusure aziendali e carico non-offerta (M4, decisione D10).
 *
 * `CARICO_NON_OFFERTA` con `oreGiorno` valorizzato e il modo per rappresentare
 * chi fa anche commesse o assistenza: sottrae ore alla capacita senza
 * comparire come assenza.
 */
const Corpo = z
  .object({
    personaId: z.string().min(1).nullable(),
    dataInizio: z.string().refine(eDataCivile, { message: 'Formato atteso YYYY-MM-DD' }),
    dataFine: z.string().refine(eDataCivile, { message: 'Formato atteso YYYY-MM-DD' }),
    tipo: z.enum([
      'FERIE',
      'PERMESSO',
      'FESTIVITA',
      'CHIUSURA_AZIENDALE',
      'FORMAZIONE',
      'CARICO_NON_OFFERTA',
    ]),
    oreGiorno: z.number().min(0.5).max(24).nullable().optional(),
    descrizione: z.string().trim().max(200).nullable().optional(),
  })
  .refine((c) => confronta(c.dataFine as DataCivile, c.dataInizio as DataCivile) >= 0, {
    message: 'La data di fine non puo precedere quella di inizio',
    path: ['dataFine'],
  })
  .refine((c) => c.tipo !== 'CARICO_NON_OFFERTA' || (c.oreGiorno ?? 0) > 0, {
    message: 'Il carico non-offerta richiede le ore al giorno da sottrarre',
    path: ['oreGiorno'],
  });

export async function POST(richiesta: Request): Promise<NextResponse> {
  const letto = await leggiCorpo(richiesta, Corpo);
  if (!letto.ok) return letto.risposta;

  try {
    const utente = await richiediUtente();
    richiediPermesso(
      puoModificareImpostazioni(utente.ruolo),
      'Solo il responsabile di divisione puo modificare il calendario',
    );

    if (letto.dati.personaId !== null) {
      const persona = await db.persona.findUnique({ where: { id: letto.dati.personaId } });
      if (!persona) return NextResponse.json({ errore: 'Persona non trovata' }, { status: 404 });
    }

    const creata = await db.indisponibilita.create({
      data: {
        personaId: letto.dati.personaId,
        dataInizio: aDateUtc(letto.dati.dataInizio as DataCivile),
        dataFine: aDateUtc(letto.dati.dataFine as DataCivile),
        tipo: letto.dati.tipo,
        oreGiorno: letto.dati.oreGiorno ?? null,
        descrizione: letto.dati.descrizione ?? null,
      },
      select: { id: true },
    });
    return NextResponse.json(creata, { status: 201 });
  } catch (errore) {
    return rispostaDaErrore(errore);
  }
}
