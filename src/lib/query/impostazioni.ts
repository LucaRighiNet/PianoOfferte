import 'server-only';
import { db } from '@/lib/db';
import { daIstante, type DataCivile } from '@/lib/data/dataCivile';

export interface PersonaImpostazioni {
  readonly id: string;
  readonly nome: string;
  readonly cognome: string;
  readonly email: string;
  readonly ruolo: string;
  readonly capacitaOreGiorno: number;
  readonly percentualeContratto: number;
  readonly limiteWip: number;
  readonly attiva: boolean;
  readonly colore: string;
  readonly attivitaAperte: number;
}

export interface IndisponibilitaImpostazioni {
  readonly id: string;
  readonly personaId: string | null;
  readonly persona: string | null;
  readonly dataInizio: DataCivile;
  readonly dataFine: DataCivile;
  readonly tipo: string;
  readonly oreGiorno: number | null;
  readonly descrizione: string | null;
}

export interface TipoAttivitaImpostazioni {
  readonly id: string;
  readonly nome: string;
  readonly stimaDefaultOre: number;
  readonly colore: string;
  readonly attivo: boolean;
  readonly usi: number;
}

export interface TipoOffertaImpostazioni {
  readonly id: string;
  readonly nome: string;
  readonly righe: readonly { readonly tipoAttivita: string; readonly stimaOre: number }[];
  readonly oreTotali: number;
  readonly usi: number;
}

export interface DatiImpostazioni {
  readonly oggi: DataCivile;
  readonly persone: readonly PersonaImpostazioni[];
  readonly indisponibilita: readonly IndisponibilitaImpostazioni[];
  readonly tipiAttivita: readonly TipoAttivitaImpostazioni[];
  readonly tipiOfferta: readonly TipoOffertaImpostazioni[];
}

export async function caricaImpostazioni(): Promise<DatiImpostazioni> {
  const oggi = daIstante(new Date());

  const [persone, indisponibilita, tipiAttivita, tipiOfferta] = await Promise.all([
    db.persona.findMany({
      orderBy: [{ attiva: 'desc' }, { cognome: 'asc' }],
      include: {
        _count: { select: { attivita: { where: { stato: { in: ['IN_CORSO', 'BLOCCATA'] } } } } },
      },
    }),
    db.indisponibilita.findMany({
      orderBy: { dataInizio: 'desc' },
      take: 200,
      include: { persona: { select: { nome: true, cognome: true } } },
    }),
    db.tipoAttivita.findMany({
      orderBy: { ordine: 'asc' },
      include: { _count: { select: { attivita: true } } },
    }),
    db.tipoOfferta.findMany({
      orderBy: { ordine: 'asc' },
      include: {
        righe: { orderBy: { ordine: 'asc' }, include: { tipoAttivita: { select: { nome: true } } } },
        _count: { select: { offerte: true } },
      },
    }),
  ]);

  return {
    oggi,
    persone: persone.map((p) => ({
      id: p.id,
      nome: p.nome,
      cognome: p.cognome,
      email: p.email,
      ruolo: p.ruolo,
      capacitaOreGiorno: Number(p.capacitaOreGiorno),
      percentualeContratto: p.percentualeContratto,
      limiteWip: p.limiteWip,
      attiva: p.attiva,
      colore: p.colore,
      attivitaAperte: p._count.attivita,
    })),
    indisponibilita: indisponibilita.map((i) => ({
      id: i.id,
      personaId: i.personaId,
      persona: i.persona ? `${i.persona.cognome} ${i.persona.nome}` : null,
      dataInizio: daIstante(i.dataInizio, 'UTC'),
      dataFine: daIstante(i.dataFine, 'UTC'),
      tipo: i.tipo,
      oreGiorno: i.oreGiorno === null ? null : Number(i.oreGiorno),
      descrizione: i.descrizione,
    })),
    tipiAttivita: tipiAttivita.map((t) => ({
      id: t.id,
      nome: t.nome,
      stimaDefaultOre: Number(t.stimaDefaultOre),
      colore: t.colore,
      attivo: t.attivo,
      usi: t._count.attivita,
    })),
    tipiOfferta: tipiOfferta.map((t) => ({
      id: t.id,
      nome: t.nome,
      righe: t.righe.map((r) => ({
        tipoAttivita: r.tipoAttivita.nome,
        stimaOre: Number(r.stimaOre),
      })),
      oreTotali: t.righe.reduce((s, r) => s + Number(r.stimaOre), 0),
      usi: t._count.offerte,
    })),
  };
}
