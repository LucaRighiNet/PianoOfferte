import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rispostaDaErrore } from '@/lib/server/risposte';
import { richiediPermesso, richiediUtente } from '@/lib/auth/sessione';
import { puoModificareImpostazioni } from '@/lib/auth/permessi';

export async function DELETE(
  _richiesta: Request,
  contesto: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await contesto.params;
  try {
    const utente = await richiediUtente();
    richiediPermesso(
      puoModificareImpostazioni(utente.ruolo),
      'Solo il responsabile di divisione puo modificare il calendario',
    );

    const esistente = await db.indisponibilita.findUnique({ where: { id } });
    if (!esistente) {
      return NextResponse.json({ errore: 'Voce non trovata' }, { status: 404 });
    }
    await db.indisponibilita.delete({ where: { id } });
    return NextResponse.json({ eliminata: id });
  } catch (errore) {
    return rispostaDaErrore(errore);
  }
}
