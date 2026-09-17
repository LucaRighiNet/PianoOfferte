import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { daIstante } from '@/lib/data/dataCivile';
import { richiediUtente, AccessoNegato } from '@/lib/auth/sessione';
import { puoCambiareStato } from '@/lib/auth/permessi';
import { rispostaDaErrore } from '@/lib/server/risposte';

/**
 * Cambio di stato di una attivita (M7, avanzamento a un click).
 *
 * Controllo di concorrenza ottimistico secondo il par. 14.2 del piano: il
 * client invia la versione che ha letto; se nel frattempo qualcun altro ha
 * modificato la riga, il server rifiuta con 409 e restituisce lo stato attuale
 * invece di sovrascrivere in silenzio.
 */

const Corpo = z.object({
  stato: z.enum(['NON_INIZIATA', 'IN_CORSO', 'BLOCCATA', 'COMPLETATA']),
  causaleBlocco: z
    .enum([
      'ATTESA_DATO_CLIENTE',
      'ATTESA_QUOTAZIONE_FORNITORE',
      'ATTESA_SPECIFICA_TECNICA',
      'PRIORITA_SUPERIORE',
      'ALTRO',
    ])
    .nullable()
    .optional(),
  versione: z.number().int().nonnegative(),
});

export async function PATCH(
  richiesta: Request,
  contesto: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await contesto.params;

  let corpoGrezzo: unknown;
  try {
    corpoGrezzo = await richiesta.json();
  } catch {
    return NextResponse.json({ errore: 'Corpo della richiesta non valido' }, { status: 400 });
  }

  const analisi = Corpo.safeParse(corpoGrezzo);
  if (!analisi.success) {
    return NextResponse.json(
      { errore: 'Dati non validi', dettaglio: analisi.error.flatten() },
      { status: 400 },
    );
  }
  const { stato, causaleBlocco, versione } = analisi.data;

  // Lo stato Bloccata senza causale non e ammesso: par. 5.1 M6, la causale e
  // l'unico motivo per cui quello stato esiste.
  if (stato === 'BLOCCATA' && (causaleBlocco === null || causaleBlocco === undefined)) {
    return NextResponse.json(
      { errore: 'Lo stato Bloccata richiede una causale' },
      { status: 400 },
    );
  }

  let utenteId: string;
  let attuale;
  try {
    const utente = await richiediUtente();
    utenteId = utente.id;

    attuale = await db.attivita.findUnique({
      where: { id },
      select: {
        id: true,
        versione: true,
        stato: true,
        iniziataIl: true,
        dataInizio: true,
        personaId: true,
      },
    });
    if (!attuale) {
      return NextResponse.json({ errore: 'Attivita non trovata' }, { status: 404 });
    }

    // Un operatore aggiorna cio che ha in mano, non il lavoro di un collega.
    if (!puoCambiareStato(utente.ruolo, utente.id, attuale.personaId)) {
      throw new AccessoNegato('Questa attivita non e assegnata a te');
    }
  } catch (errore) {
    return rispostaDaErrore(errore);
  }
  if (attuale.versione !== versione) {
    return NextResponse.json(
      {
        errore: 'La riga e stata modificata da qualcun altro',
        versioneAttuale: attuale.versione,
        statoAttuale: attuale.stato,
      },
      { status: 409 },
    );
  }

  const adesso = new Date();
  const oggi = daIstante(adesso);

  const aggiornata = await db.attivita.update({
    where: { id, versione },
    data: {
      stato,
      causaleBlocco: stato === 'BLOCCATA' ? (causaleBlocco ?? 'ALTRO') : null,
      versione: { increment: 1 },
      // L'inizio effettivo si registra una volta sola: serve all'aging del WIP.
      iniziataIl:
        attuale.iniziataIl === null && stato !== 'NON_INIZIATA'
          ? (attuale.dataInizio ?? new Date(`${oggi}T00:00:00Z`))
          : attuale.iniziataIl,
      completataIl: stato === 'COMPLETATA' ? adesso : null,
    },
    select: { id: true, stato: true, causaleBlocco: true, versione: true },
  });

  await db.eventoAudit.create({
    data: {
      entita: 'Attivita',
      entitaId: id,
      utenteId,
      azione: 'CAMBIO_STATO',
      prima: { stato: attuale.stato },
      dopo: { stato: aggiornata.stato },
    },
  });

  return NextResponse.json(aggiornata);
}
