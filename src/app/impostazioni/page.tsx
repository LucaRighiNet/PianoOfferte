import { redirect } from 'next/navigation';
import { caricaImpostazioni } from '@/lib/query/impostazioni';
import { statoAccesso } from '@/lib/auth/sessione';
import { puoModificareImpostazioni } from '@/lib/auth/permessi';
import { Impostazioni } from '@/components/Impostazioni';

export const dynamic = 'force-dynamic';

export default async function PaginaImpostazioni() {
  const accesso = await statoAccesso();
  if (accesso.tipo !== 'UTENTE') redirect('/accesso');
  const utente = accesso.utente;
  // Le impostazioni decidono la capacita su cui si basa tutto il resto:
  // chi non puo modificarle non ha motivo di vederle.
  if (!puoModificareImpostazioni(utente.ruolo)) redirect('/pianificazione');

  const dati = await caricaImpostazioni();
  return <Impostazioni dati={dati} />;
}
