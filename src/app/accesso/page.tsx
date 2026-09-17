import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { modalitaAutenticazione, statoAccesso } from '@/lib/auth/sessione';
import { ETICHETTE_RUOLO, type Ruolo } from '@/lib/auth/permessi';
import { SceltaUtente } from '@/components/SceltaUtente';

export const dynamic = 'force-dynamic';

export default async function PaginaAccesso() {
  const accesso = await statoAccesso();
  if (accesso.tipo === 'UTENTE') redirect('/pianificazione');
  if (accesso.tipo === 'CONFIGURAZIONE_NON_AMMESSA') {
    return <SceltaUtente modalita="sviluppo" persone={[]} erroreConfigurazione={accesso.motivo} />;
  }

  const persone = await db.persona.findMany({
    where: { attiva: true },
    orderBy: [{ ruolo: 'asc' }, { cognome: 'asc' }],
    select: { nome: true, cognome: true, email: true, ruolo: true, colore: true },
  });

  return (
    <SceltaUtente
      modalita={modalitaAutenticazione()}
      persone={persone.map((p) => ({
        nome: p.nome,
        cognome: p.cognome,
        email: p.email,
        colore: p.colore,
        ruolo: p.ruolo as Ruolo,
        etichettaRuolo: ETICHETTE_RUOLO[p.ruolo as Ruolo],
      }))}
    />
  );
}
