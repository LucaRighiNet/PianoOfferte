import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { modalitaAutenticazione, utenteCorrente } from '@/lib/auth/sessione';
import { ETICHETTE_RUOLO, type Ruolo } from '@/lib/auth/permessi';
import { SceltaUtente } from '@/components/SceltaUtente';

export const dynamic = 'force-dynamic';

export default async function PaginaAccesso() {
  if (modalitaAutenticazione() === 'easyauth') {
    // Con Entra ID davanti, chi arriva qui e gia autenticato: o e censito e
    // prosegue, o va detto a chi di dovere che manca la sua utenza.
    const utente = await utenteCorrente();
    if (utente !== null) redirect('/pianificazione');
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
