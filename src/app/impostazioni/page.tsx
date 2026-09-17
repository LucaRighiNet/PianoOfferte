import { caricaImpostazioni } from '@/lib/query/impostazioni';
import { Impostazioni } from '@/components/Impostazioni';

export const dynamic = 'force-dynamic';

export default async function PaginaImpostazioni() {
  const dati = await caricaImpostazioni();
  return <Impostazioni dati={dati} />;
}
