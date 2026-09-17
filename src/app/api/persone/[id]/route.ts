import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { leggiCorpo, rispostaDaErrore } from '@/lib/server/risposte';

/**
 * Capacita e parametri di una persona (M4, decisione D9 del piano).
 *
 * `capacitaOreGiorno` non e l'orario contrattuale: sono le ore che la persona
 * dedica davvero allo sviluppo offerte. E' il denominatore della saturazione,
 * quindi un valore sbagliato rende la heatmap inutile.
 */
const Corpo = z.object({
  capacitaOreGiorno: z.number().min(0).max(24).optional(),
  percentualeContratto: z.number().int().min(1).max(100).optional(),
  limiteWip: z.number().int().min(1).max(50).optional(),
  attiva: z.boolean().optional(),
  colore: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Colore atteso nel formato #rrggbb')
    .optional(),
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
    const precedente = await db.persona.findUnique({
      where: { id },
      select: { capacitaOreGiorno: true, percentualeContratto: true, limiteWip: true, attiva: true },
    });
    if (!precedente) return NextResponse.json({ errore: 'Persona non trovata' }, { status: 404 });

    const aggiornata = await db.persona.update({
      where: { id },
      data: letto.dati,
      select: {
        id: true,
        capacitaOreGiorno: true,
        percentualeContratto: true,
        limiteWip: true,
        attiva: true,
        colore: true,
      },
    });

    await db.eventoAudit.create({
      data: {
        entita: 'Persona',
        entitaId: id,
        azione: 'MODIFICA_CAPACITA',
        prima: {
          capacitaOreGiorno: Number(precedente.capacitaOreGiorno),
          percentualeContratto: precedente.percentualeContratto,
          limiteWip: precedente.limiteWip,
          attiva: precedente.attiva,
        },
        dopo: { ...letto.dati },
      },
    });

    return NextResponse.json({
      ...aggiornata,
      capacitaOreGiorno: Number(aggiornata.capacitaOreGiorno),
    });
  } catch (errore) {
    return rispostaDaErrore(errore);
  }
}
