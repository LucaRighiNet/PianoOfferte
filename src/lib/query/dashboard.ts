import 'server-only';
import { db } from '@/lib/db';
import {
  aDateUtc,
  aggiungiGiorni,
  daIstante,
  differenzaGiorni,
  inizioSettimana,
  settimanaIso,
  type DataCivile,
} from '@/lib/data/dataCivile';
import { caricaCalendario } from '@/lib/server/pianificazione';
import {
  aggregaCarico,
  allocazionePerPersona,
  caricoGiornaliero,
  type CaricoAggregato,
} from '@/lib/capacita/saturazione';
import {
  leadTimeComplessivo,
  leadTimePerTipo,
  offerteARischio,
  ordinaWip,
  puntualita,
  type OffertaMisurabile,
  type VoceRischio,
  type VoceWip,
} from '@/lib/metriche/dashboard';

/**
 * Dati della dashboard direzionale (S1).
 *
 * Finestra di misura: sei mesi indietro per i tempi, quattro settimane avanti
 * per il carico. Sono i due orizzonti su cui si decide davvero: il passato
 * recente dice quanto siamo veloci, il mese entrante dice se possiamo accettare
 * altro lavoro.
 */

const GIORNI_STORICO = 180;
const SETTIMANE_CARICO = 4;
/** Sopra questo margine in giorni una offerta non e "a rischio". */
const MARGINE_RISCHIO_GIORNI = 5;

export interface SettimanaCarico {
  readonly chiave: string;
  readonly etichetta: string;
  readonly inizio: DataCivile;
  readonly fine: DataCivile;
}

export interface RigaCarico {
  readonly personaId: string;
  readonly persona: string;
  readonly settimane: readonly CaricoAggregato[];
}

export interface DatiDashboard {
  readonly oggi: DataCivile;
  readonly giorniStorico: number;
  readonly settimane: readonly SettimanaCarico[];
  readonly carico: readonly RigaCarico[];
  readonly rischio: readonly VoceRischio[];
  readonly wip: readonly VoceWip[];
  readonly leadTime: { readonly mediana: number | null; readonly campione: number };
  readonly leadTimePerTipo: readonly {
    readonly tipo: string;
    readonly mediana: number;
    readonly campione: number;
  }[];
  readonly puntualita: {
    readonly consegnateInTempo: number;
    readonly consegnateTotali: number;
    readonly percentuale: number | null;
  };
}

export async function caricaDashboard(): Promise<DatiDashboard> {
  const oggi = daIstante(new Date());
  const inizioCarico = inizioSettimana(oggi);
  const inizioStorico = aggiungiGiorni(oggi, -GIORNI_STORICO);

  const [persone, offerte, calendario] = await Promise.all([
    db.persona.findMany({
      where: { attiva: true },
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, cognome: true, limiteWip: true },
    }),
    db.offerta.findMany({
      where: { dataRichiesta: { gte: aDateUtc(inizioStorico) } },
      include: {
        cliente: { select: { ragioneSociale: true } },
        tipoOfferta: { select: { nome: true } },
        attivita: {
          select: {
            id: true,
            personaId: true,
            stimaOre: true,
            dataInizio: true,
            dataFine: true,
            stato: true,
            causaleBlocco: true,
            iniziataIl: true,
            persona: { select: { nome: true, cognome: true } },
          },
        },
      },
    }),
    caricaCalendario(),
  ]);

  // --- carico delle prossime settimane -------------------------------------
  const attivitaPianificate = offerte.flatMap((o) =>
    o.attivita
      .filter((a) => a.dataInizio !== null && a.dataFine !== null && a.stato !== 'COMPLETATA')
      .map((a) => ({
        id: a.id,
        personaId: a.personaId,
        dataInizio: daIstante(a.dataInizio as Date, 'UTC'),
        dataFine: daIstante(a.dataFine as Date, 'UTC'),
        stimaOre: Number(a.stimaOre),
      })),
  );
  const allocazione = allocazionePerPersona(calendario, attivitaPianificate);

  const settimane: SettimanaCarico[] = [];
  for (let i = 0; i < SETTIMANE_CARICO; i += 1) {
    const inizio = aggiungiGiorni(inizioCarico, i * 7);
    const fine = aggiungiGiorni(inizio, 6);
    const iso = settimanaIso(inizio);
    settimane.push({
      chiave: `${iso.anno}-W${iso.settimana}`,
      etichetta: `W${iso.settimana}`,
      inizio,
      fine,
    });
  }

  const carico: RigaCarico[] = persone.map((p) => ({
    personaId: p.id,
    persona: `${p.cognome} ${p.nome}`,
    settimane: settimane.map((s) =>
      aggregaCarico(
        caricoGiornaliero(calendario, p.id, s.inizio, s.fine, allocazione.get(p.id)),
      ),
    ),
  }));
  // --- misure sulle offerte -------------------------------------------------
  const misurabili: OffertaMisurabile[] = offerte.map((o) => {
    const conDate = o.attivita.filter((a) => a.dataFine !== null);
    const fine = conDate.reduce<DataCivile | null>((massimo, a) => {
      const d = daIstante(a.dataFine as Date, 'UTC');
      return massimo === null || d > massimo ? d : massimo;
    }, null);
    const bloccata = o.attivita.find((a) => a.stato === 'BLOCCATA') ?? null;
    const inCarico = o.attivita.find((a) => a.persona !== null) ?? null;

    return {
      id: o.id,
      codice: o.codice,
      descrizione: o.descrizione,
      cliente: o.cliente.ragioneSociale,
      tipoOfferta: o.tipoOfferta?.nome ?? null,
      dataRichiesta: daIstante(o.dataRichiesta, 'UTC'),
      dataScadenzaCliente:
        o.dataScadenzaCliente === null ? null : daIstante(o.dataScadenzaCliente, 'UTC'),
      dataFinePianificata: fine,
      consegnata: o.stato === 'CONSEGNATA' || o.stato === 'CHIUSA',
      bloccata: bloccata !== null,
      causaleBlocco: bloccata?.causaleBlocco ?? null,
      personaId: inCarico?.personaId ?? null,
      persona: inCarico?.persona
        ? `${inCarico.persona.cognome} ${inCarico.persona.nome}`
        : null,
    };
  });

  // --- lavoro in corso ------------------------------------------------------
  const wip: VoceWip[] = persone.map((p) => {
    const aperte = offerte.flatMap((o) =>
      o.attivita.filter(
        (a) => a.personaId === p.id && (a.stato === 'IN_CORSO' || a.stato === 'BLOCCATA'),
      ),
    );
    const anzianita = aperte
      .map((a) =>
        a.iniziataIl === null ? null : differenzaGiorni(oggi, daIstante(a.iniziataIl, 'UTC')),
      )
      .filter((v): v is number => v !== null && v >= 0);

    return {
      personaId: p.id,
      persona: `${p.cognome} ${p.nome}`,
      aperte: aperte.length,
      limite: p.limiteWip,
      oltreIlLimite: aperte.length > p.limiteWip,
      anzianitaMassima: anzianita.length === 0 ? null : Math.max(...anzianita),
    };
  });

  return {
    oggi,
    giorniStorico: GIORNI_STORICO,
    settimane,
    carico,
    rischio: offerteARischio(misurabili, MARGINE_RISCHIO_GIORNI).slice(0, 25),
    wip: ordinaWip(wip),
    leadTime: leadTimeComplessivo(misurabili),
    leadTimePerTipo: leadTimePerTipo(misurabili),
    puntualita: puntualita(misurabili),
  };
}
