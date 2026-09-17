import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eDataCivile, type DataCivile } from '@/lib/data/dataCivile';
import { creaOfferta, DatiOffertaNonValidi } from '@/lib/server/offerte';
import { leggiCorpo, rispostaDaErrore } from '@/lib/server/risposte';
import { richiediPermesso, richiediUtente } from '@/lib/auth/sessione';
import { puoCreareOfferta } from '@/lib/auth/permessi';

const Corpo = z
  .object({
    descrizione: z.string().trim().min(3).max(200),
    clienteId: z.string().min(1).optional(),
    clienteNome: z.string().trim().min(2).max(120).optional(),
    tipoOffertaId: z.string().min(1),
    kamId: z.string().min(1).nullable().optional(),
    dataScadenzaCliente: z
      .string()
      .refine(eDataCivile, { message: 'Formato data atteso YYYY-MM-DD' })
      .nullable()
      .optional(),
    valoreStimato: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
    priorita: z.enum(['BASSA', 'NORMALE', 'ALTA', 'URGENTE']).optional(),
    note: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((c) => c.clienteId !== undefined || c.clienteNome !== undefined, {
    message: 'Indicare un cliente esistente o il nome di uno nuovo',
    path: ['clienteId'],
  });

export async function POST(richiesta: Request): Promise<NextResponse> {
  const letto = await leggiCorpo(richiesta, Corpo);
  if (!letto.ok) return letto.risposta;

  try {
    const utente = await richiediUtente();
    richiediPermesso(
      puoCreareOfferta(utente.ruolo),
      'Solo responsabile, KAM e direzione possono inserire una richiesta di offerta',
    );

    const creata = await creaOfferta({
      descrizione: letto.dati.descrizione,
      ...(letto.dati.clienteId !== undefined ? { clienteId: letto.dati.clienteId } : {}),
      ...(letto.dati.clienteNome !== undefined ? { clienteNome: letto.dati.clienteNome } : {}),
      tipoOffertaId: letto.dati.tipoOffertaId,
      kamId: letto.dati.kamId ?? null,
      dataScadenzaCliente: (letto.dati.dataScadenzaCliente ?? null) as DataCivile | null,
      valoreStimato: letto.dati.valoreStimato ?? null,
      ...(letto.dati.priorita !== undefined ? { priorita: letto.dati.priorita } : {}),
      note: letto.dati.note ?? null,
    });
    return NextResponse.json(creata, { status: 201 });
  } catch (errore) {
    if (errore instanceof DatiOffertaNonValidi) {
      return NextResponse.json({ errore: errore.message }, { status: 400 });
    }
    return rispostaDaErrore(errore);
  }
}
