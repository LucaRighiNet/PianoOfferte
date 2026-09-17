import { redirect } from 'next/navigation';
import { caricaImpostazioni } from '@/lib/query/impostazioni';
import { utenteCorrente } from '@/lib/auth/sessione';
import { puoModificareImpostazioni } from '@/lib/auth/permessi';
import { Impostazioni } from '@/components/Impostazioni';

export const dynamic = 'force-dynamic';

export default async function PaginaImpostazioni() {
  const utente = await utenteCorrente();
  if (utente === null) redirect('/accesso');
  // Le impostazioni decidono la capacita su cui si basa tutto il resto:
  // chi non puo modificarle non ha motivo di vederle.
  if (!puoModificareImpostazioni(utente.ruolo)) redirect('/pianificazione');

  const dati = await caricaImpostazioni();
  return <Impostazioni dati={dati} />;
}
