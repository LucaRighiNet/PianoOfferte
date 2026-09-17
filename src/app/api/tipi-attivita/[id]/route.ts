import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { leggiCorpo, rispostaDaErrore } from '@/lib/server/risposte';

/**
 * Stima predefinita per tipo di attivita (M1).
 *
 * E' il valore che riempie il campo da solo quando nasce una richiesta: e la
 * mitigazione del rischio R2, cioe stime mai inserite e heatmap vuota.
 */
const Corpo = z.object({
  stimaDefaultOre: z.number().positive().max(500).optional(),
  colore: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  attivo: z.boolean().optional(),
});

export async function PATCH(
  richiesta: Request,
  contesto: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await contesto.params;
  const letto = await leggiCorpo(richiesta, Corpo);
  if (!letto.ok) return letto.risposta;
  if (Object.keys(letto.dati).length === 0) {
    return NextResponse.json({ errore: 'Nessuna modifica indicata' }, { status: 400 });
  }

  try {
    const esistente = await db.tipoAttivita.findUnique({ where: { id } });
    if (!esistente) return NextResponse.json({ errore: 'Tipo non trovato' }, { status: 404 });

    const aggiornato = await db.tipoAttivita.update({
      where: { id },
      data: letto.dati,
      select: { id: true, nome: true, stimaDefaultOre: true, colore: true, attivo: true },
    });
    return NextResponse.json({
      ...aggiornato,
      stimaDefaultOre: Number(aggiornato.stimaDefaultOre),
    });
  } catch (errore) {
    return rispostaDaErrore(errore);
  }
}
