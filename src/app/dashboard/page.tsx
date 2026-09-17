import { redirect } from 'next/navigation';
import { caricaDashboard } from '@/lib/query/dashboard';
import { utenteCorrente } from '@/lib/auth/sessione';
import { Dashboard } from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function PaginaDashboard() {
  const utente = await utenteCorrente();
  if (utente === null) redirect('/accesso');

  const dati = await caricaDashboard(utente);
  return <Dashboard dati={dati} />;
}
