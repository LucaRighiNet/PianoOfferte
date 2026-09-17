import { aggiungiGiorni, daIstante, eDataCivile, inizioSettimana } from '@/lib/data/dataCivile';
import { redirect } from 'next/navigation';
import { caricaPiano } from '@/lib/query/piano';
import { statoAccesso } from '@/lib/auth/sessione';
import { finestraDaCaricare, zoomDaParametro } from '@/lib/vista/zoom';
import { Pianificatore } from '@/components/Pianificatore';

export const dynamic = 'force-dynamic';

export default async function PaginaPianificazione({
  searchParams,
}: {
  searchParams: Promise<{ da?: string; zoom?: string }>;
}) {
  const accesso = await statoAccesso();
  if (accesso.tipo !== 'UTENTE') redirect('/accesso');
  const utente = accesso.utente;

  const parametri = await searchParams;
  const oggi = daIstante(new Date());
  const ancora =
    parametri.da !== undefined && eDataCivile(parametri.da)
      ? inizioSettimana(parametri.da)
      : inizioSettimana(aggiungiGiorni(oggi, -14));

  // La finestra segue lo zoom: un periodo visibile piu uno di margine per lato.
  const zoom = zoomDaParametro(parametri.zoom);
  const { primaDellAncora, dopoLAncora } = finestraDaCaricare(zoom);

  const dati = await caricaPiano(
    aggiungiGiorni(ancora, -primaDellAncora),
    aggiungiGiorni(ancora, dopoLAncora),
    utente,
  );

  return <Pianificatore dati={dati} ancoraIniziale={ancora} zoomIniziale={zoom} />;
}
