import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { leggiCorpo, rispostaDaErrore } from '@/lib/server/risposte';
import { AccessoNegato, richiediUtente } from '@/lib/auth/sessione';
import { puoRegistrareConsuntivo } from '@/lib/auth/permessi';

/**
 * Consuntivo delle ore effettive (S4).
 *
 * Serve a tarare le stime predefinite: senza, le stime restano opinioni per
 * sempre. E' pero la funzione piu esposta all'art. 4 dello Statuto dei
 * Lavoratori, perche misura a posteriori la prestazione individuale. Le
 * salvaguardie sono nel codice, non nelle intenzioni:
 *
 * - lo registra SOLO la persona che ha svolto il lavoro, nemmeno il
 *   responsabile per conto suo (vedi `puoRegistrareConsuntivo`);
 * - il campo arriva precompilato con la stima, quindi confermare costa un
 *   click e non produce un dato inventato per sbrigarsi;
 * - ogni scrittura finisce nel registro di audit con l'autore;
 * - l'uso dei dati resta subordinato all'informativa di cui al par. 14.1 del
 *   piano e a `docs/02-informativa-art4.md`.
 */

const Corpo = z.object({
  /** `null` cancella il consuntivo inserito per errore. */
  consuntivoOre: z.number().positive().max(2000).nullable(),
});

export async function PATCH(
  richiesta: Request,
  contesto: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await contesto.params;
  const letto = await leggiCorpo(richiesta, Corpo);
  if (!letto.ok) return letto.risposta;

  try {
    const utente = await richiediUtente();

    const attuale = await db.attivita.findUnique({
      where: { id },
      select: { id: true, personaId: true, consuntivoOre: true, stimaOre: true },
    });
    if (!attuale) return NextResponse.json({ errore: 'Attivita non trovata' }, { status: 404 });

    if (!puoRegistrareConsuntivo(utente.ruolo, utente.id, attuale.personaId)) {
      throw new AccessoNegato(
        'Le ore effettive le registra chi ha svolto il lavoro, non un altro al posto suo',
      );
    }

    const aggiornata = await db.attivita.update({
      where: { id },
      data: { consuntivoOre: letto.dati.consuntivoOre },
      select: { id: true, consuntivoOre: true, stimaOre: true },
    });

    await db.eventoAudit.create({
      data: {
        entita: 'Attivita',
        entitaId: id,
        utenteId: utente.id,
        azione: 'CONSUNTIVO_ORE',
        prima: {
          consuntivoOre: attuale.consuntivoOre === null ? null : Number(attuale.consuntivoOre),
        },
        dopo: { consuntivoOre: letto.dati.consuntivoOre },
      },
    });

    return NextResponse.json({
      id: aggiornata.id,
      consuntivoOre:
        aggiornata.consuntivoOre === null ? null : Number(aggiornata.consuntivoOre),
      stimaOre: Number(aggiornata.stimaOre),
    });
  } catch (errore) {
    return rispostaDaErrore(errore);
  }
}
