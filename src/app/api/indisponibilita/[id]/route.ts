import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rispostaDaErrore } from '@/lib/server/risposte';

export async function DELETE(
  _richiesta: Request,
  contesto: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await contesto.params;
  try {
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
