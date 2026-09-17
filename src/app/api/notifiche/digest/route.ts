import { NextResponse } from 'next/server';
import { inviaDigestGiornaliero } from '@/lib/server/notifiche';
import { rispostaDaErrore } from '@/lib/server/risposte';

/**
 * Invio del digest giornaliero, chiamato da uno scheduler esterno.
 *
 * Protetta da una chiave condivisa invece che dalla sessione: chi la invoca e
 * una macchina, non una persona. Senza `CHIAVE_NOTIFICHE` configurata la rotta
 * resta chiusa: un endpoint che spedisce posta a tutta la divisione non deve
 * essere aperto per dimenticanza.
 */
export async function POST(richiesta: Request): Promise<NextResponse> {
  const attesa = process.env.CHIAVE_NOTIFICHE;
  if (attesa === undefined || attesa.trim() === '') {
    return NextResponse.json(
      { errore: 'Notifiche non configurate: manca CHIAVE_NOTIFICHE' },
      { status: 503 },
    );
  }
  if (richiesta.headers.get('x-chiave-notifiche') !== attesa) {
    return NextResponse.json({ errore: 'Chiave non valida' }, { status: 401 });
  }

  try {
    return NextResponse.json(await inviaDigestGiornaliero());
  } catch (errore) {
    return rispostaDaErrore(errore);
  }
}
