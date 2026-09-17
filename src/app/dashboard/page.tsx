import { caricaDashboard } from '@/lib/query/dashboard';
import { Dashboard } from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function PaginaDashboard() {
  const dati = await caricaDashboard();
  return <Dashboard dati={dati} />;
}
