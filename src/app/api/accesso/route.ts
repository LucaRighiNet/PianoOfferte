import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { COOKIE_SVILUPPO } from '@/lib/auth/identita';
import { modalitaAmmessa } from '@/lib/auth/identita';
import { modalitaAutenticazione } from '@/lib/auth/sessione';
import { leggiCorpo, rispostaDaErrore } from '@/lib/server/risposte';

/**
 * Accesso in modalita sviluppo: si sceglie chi essere fra le persone censite.
 *
 * In modalita `easyauth` questa rotta e disattivata: l'identita la fornisce la
 * piattaforma e permettere di sceglierla da qui sarebbe un modo per aggirarla.
 */

const Corpo = z.object({ email: z.string().email() });

export async function POST(richiesta: Request): Promise<NextResponse> {
  const modalita = modalitaAutenticazione();
  if (modalita === 'easyauth') {
    return NextResponse.json(
      { errore: 'In modalita Entra ID l identita e fornita dalla piattaforma' },
      { status: 404 },
    );
  }
  if (!modalitaAmmessa(modalita, process.env)) {
    return NextResponse.json(
      { errore: 'Accesso di sviluppo non ammesso in questo ambiente' },
      { status: 403 },
    );
  }

  const letto = await leggiCorpo(richiesta, Corpo);
  if (!letto.ok) return letto.risposta;

  try {
    const persona = await db.persona.findUnique({
      where: { email: letto.dati.email.toLowerCase() },
      select: { id: true, attiva: true },
    });
    if (!persona || !persona.attiva) {
      return NextResponse.json({ errore: 'Persona non censita o non attiva' }, { status: 404 });
    }

    const risposta = NextResponse.json({ ok: true });
    risposta.cookies.set(COOKIE_SVILUPPO, letto.dati.email.toLowerCase(), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
    return risposta;
  } catch (errore) {
    return rispostaDaErrore(errore);
  }
}

export async function DELETE(): Promise<NextResponse> {
  const risposta = NextResponse.json({ ok: true });
  risposta.cookies.delete(COOKIE_SVILUPPO);
  return risposta;
}
