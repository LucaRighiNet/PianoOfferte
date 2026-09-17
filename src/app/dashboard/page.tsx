import { redirect } from 'next/navigation';
import { caricaDashboard } from '@/lib/query/dashboard';
import { statoAccesso } from '@/lib/auth/sessione';
import { Dashboard } from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function PaginaDashboard() {
  const accesso = await statoAccesso();
  if (accesso.tipo !== 'UTENTE') redirect('/accesso');
  const utente = accesso.utente;

  const dati = await caricaDashboard(utente);
  return <Dashboard dati={dati} />;
}
