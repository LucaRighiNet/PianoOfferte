import { timingSafeEqual } from 'node:crypto';
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
  if (!chiaviCoincidono(richiesta.headers.get('x-chiave-notifiche'), attesa)) {
    return NextResponse.json({ errore: 'Chiave non valida' }, { status: 401 });
  }

  try {
    return NextResponse.json(await inviaDigestGiornaliero());
  } catch (errore) {
    return rispostaDaErrore(errore);
  }
}

/**
 * Confronto a tempo costante: un confronto con `!==` esce al primo carattere
 * diverso, e la differenza di tempo lascia indovinare la chiave un carattere
 * alla volta. Il costo di farlo bene e nullo.
 */
function chiaviCoincidono(ricevuta: string | null, attesa: string): boolean {
  if (ricevuta === null) return false;
  const a = Buffer.from(ricevuta, 'utf8');
  const b = Buffer.from(attesa, 'utf8');
  // timingSafeEqual pretende la stessa lunghezza: la si confronta a parte, e la
  // lunghezza di una chiave non e un segreto utile.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
