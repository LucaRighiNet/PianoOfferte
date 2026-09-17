import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eDataCivile, type DataCivile } from '@/lib/data/dataCivile';
import { creaRevisione, RevisioneNonPossibile } from '@/lib/server/revisioni';
import { leggiCorpo, rispostaDaErrore } from '@/lib/server/risposte';
import { richiediPermesso, richiediUtente } from '@/lib/auth/sessione';
import { puoPianificare } from '@/lib/auth/permessi';
import { DurataNonPianificabile } from '@/lib/calendario/calendarioLavorativo';

const Corpo = z.object({
  motivo: z.string().trim().max(500).nullable().optional(),
  nuovaScadenza: z
    .string()
    .refine(eDataCivile, { message: 'Formato data atteso YYYY-MM-DD' })
    .nullable()
    .optional(),
});

export async function POST(
  richiesta: Request,
  contesto: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await contesto.params;
  const letto = await leggiCorpo(richiesta, Corpo);
  if (!letto.ok) return letto.risposta;

  try {
    const utente = await richiediUtente();
    // Aprire una revisione crea lavoro nuovo e lo colloca: e pianificazione.
    richiediPermesso(
      puoPianificare(utente.ruolo),
      'Solo il responsabile di divisione puo aprire una revisione',
    );

    const creata = await creaRevisione({
      offertaId: id,
      motivo: letto.dati.motivo ?? null,
      nuovaScadenza: (letto.dati.nuovaScadenza ?? null) as DataCivile | null,
    });
    return NextResponse.json(creata, { status: 201 });
  } catch (errore) {
    if (errore instanceof RevisioneNonPossibile || errore instanceof DurataNonPianificabile) {
      return NextResponse.json({ errore: errore.message }, { status: 400 });
    }
    return rispostaDaErrore(errore);
  }
}
