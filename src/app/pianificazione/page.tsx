import { aggiungiGiorni, daIstante, eDataCivile, inizioSettimana } from '@/lib/data/dataCivile';
import { caricaPiano } from '@/lib/query/piano';
import { Pianificatore } from '@/components/Pianificatore';

export const dynamic = 'force-dynamic';

/**
 * Margine caricato oltre la finestra visibile, in giorni per lato.
 * Serve a rendere immediata la navigazione con le frecce: par. 7.3 del piano.
 */
const MARGINE_GIORNI = 60;

export default async function PaginaPianificazione({
  searchParams,
}: {
  searchParams: Promise<{ da?: string }>;
}) {
  const parametri = await searchParams;
  const oggi = daIstante(new Date());
  const ancora =
    parametri.da !== undefined && eDataCivile(parametri.da)
      ? inizioSettimana(parametri.da)
      : inizioSettimana(aggiungiGiorni(oggi, -14));

  const da = aggiungiGiorni(ancora, -MARGINE_GIORNI);
  const a = aggiungiGiorni(ancora, MARGINE_GIORNI + 120);

  const dati = await caricaPiano(da, a);

  return <Pianificatore dati={dati} ancoraIniziale={ancora} />;
}
