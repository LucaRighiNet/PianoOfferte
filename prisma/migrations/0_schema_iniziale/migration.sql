-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RuoloUtente" AS ENUM ('RESPONSABILE', 'OPERATORE', 'KAM', 'DIREZIONE', 'SOLA_LETTURA');

-- CreateEnum
CREATE TYPE "StatoOfferta" AS ENUM ('DA_PIANIFICARE', 'PIANIFICATA', 'IN_LAVORAZIONE', 'CONSEGNATA', 'IN_REVISIONE', 'CHIUSA');

-- CreateEnum
CREATE TYPE "EsitoOfferta" AS ENUM ('VINTA', 'PERSA', 'ANNULLATA', 'NON_OFFERTA');

-- CreateEnum
CREATE TYPE "StatoAttivita" AS ENUM ('NON_INIZIATA', 'IN_CORSO', 'BLOCCATA', 'COMPLETATA');

-- CreateEnum
CREATE TYPE "CausaleBlocco" AS ENUM ('ATTESA_DATO_CLIENTE', 'ATTESA_QUOTAZIONE_FORNITORE', 'ATTESA_SPECIFICA_TECNICA', 'PRIORITA_SUPERIORE', 'ALTRO');

-- CreateEnum
CREATE TYPE "TipoIndisponibilita" AS ENUM ('FERIE', 'PERMESSO', 'FESTIVITA', 'CHIUSURA_AZIENDALE', 'FORMAZIONE', 'CARICO_NON_OFFERTA');

-- CreateEnum
CREATE TYPE "Priorita" AS ENUM ('BASSA', 'NORMALE', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "ragioneSociale" TEXT NOT NULL,
    "codiceEsterno" TEXT,
    "attivo" BOOLEAN NOT NULL DEFAULT true,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ruolo" "RuoloUtente" NOT NULL DEFAULT 'OPERATORE',
    "entraObjectId" TEXT,
    "capacitaOreGiorno" DECIMAL(4,2) NOT NULL DEFAULT 8,
    "percentualeContratto" INTEGER NOT NULL DEFAULT 100,
    "limiteWip" INTEGER NOT NULL DEFAULT 5,
    "attiva" BOOLEAN NOT NULL DEFAULT true,
    "colore" TEXT NOT NULL DEFAULT '#3b82f6',
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoOfferta" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "attivo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoOfferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoAttivita" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "stimaDefaultOre" DECIMAL(5,2) NOT NULL DEFAULT 8,
    "colore" TEXT NOT NULL DEFAULT '#64748b',
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "attivo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TipoAttivita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateRigaOfferta" (
    "id" TEXT NOT NULL,
    "tipoOffertaId" TEXT NOT NULL,
    "tipoAttivitaId" TEXT NOT NULL,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "stimaOre" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "TemplateRigaOfferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offerta" (
    "id" TEXT NOT NULL,
    "codice" TEXT NOT NULL,
    "descrizione" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "kamId" TEXT,
    "tipoOffertaId" TEXT,
    "valoreStimato" DECIMAL(12,2),
    "dataRichiesta" DATE NOT NULL,
    "dataScadenzaCliente" DATE,
    "priorita" "Priorita" NOT NULL DEFAULT 'NORMALE',
    "stato" "StatoOfferta" NOT NULL DEFAULT 'DA_PIANIFICARE',
    "colore" TEXT NOT NULL DEFAULT '#0ea5e9',
    "note" TEXT,
    "esito" "EsitoOfferta",
    "motivoEsito" TEXT,
    "dataEsito" DATE,
    "versione" INTEGER NOT NULL DEFAULT 0,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornataIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attivita" (
    "id" TEXT NOT NULL,
    "offertaId" TEXT NOT NULL,
    "tipoAttivitaId" TEXT NOT NULL,
    "personaId" TEXT,
    "stimaOre" DECIMAL(5,2) NOT NULL,
    "consuntivoOre" DECIMAL(5,2),
    "dataInizio" DATE,
    "dataFine" DATE,
    "stato" "StatoAttivita" NOT NULL DEFAULT 'NON_INIZIATA',
    "causaleBlocco" "CausaleBlocco",
    "notaBlocco" TEXT,
    "ordine" INTEGER NOT NULL DEFAULT 0,
    "iniziataIl" TIMESTAMP(3),
    "completataIl" TIMESTAMP(3),
    "versione" INTEGER NOT NULL DEFAULT 0,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornataIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attivita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dipendenza" (
    "id" TEXT NOT NULL,
    "predecessoreId" TEXT NOT NULL,
    "successoreId" TEXT NOT NULL,

    CONSTRAINT "Dipendenza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indisponibilita" (
    "id" TEXT NOT NULL,
    "personaId" TEXT,
    "dataInizio" DATE NOT NULL,
    "dataFine" DATE NOT NULL,
    "tipo" "TipoIndisponibilita" NOT NULL,
    "oreGiorno" DECIMAL(4,2),
    "descrizione" TEXT,

    CONSTRAINT "Indisponibilita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Revisione" (
    "id" TEXT NOT NULL,
    "offertaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "motivo" TEXT,
    "attivitaId" TEXT,

    CONSTRAINT "Revisione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoAudit" (
    "id" TEXT NOT NULL,
    "entita" TEXT NOT NULL,
    "entitaId" TEXT NOT NULL,
    "utenteId" TEXT,
    "azione" TEXT NOT NULL,
    "prima" JSONB,
    "dopo" JSONB,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_ragioneSociale_key" ON "Cliente"("ragioneSociale");

-- CreateIndex
CREATE INDEX "Cliente_attivo_ragioneSociale_idx" ON "Cliente"("attivo", "ragioneSociale");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_email_key" ON "Persona"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_entraObjectId_key" ON "Persona"("entraObjectId");

-- CreateIndex
CREATE INDEX "Persona_attiva_cognome_nome_idx" ON "Persona"("attiva", "cognome", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "TipoOfferta_nome_key" ON "TipoOfferta"("nome");

-- CreateIndex
CREATE INDEX "TipoOfferta_attivo_ordine_idx" ON "TipoOfferta"("attivo", "ordine");

-- CreateIndex
CREATE UNIQUE INDEX "TipoAttivita_nome_key" ON "TipoAttivita"("nome");

-- CreateIndex
CREATE INDEX "TipoAttivita_attivo_ordine_idx" ON "TipoAttivita"("attivo", "ordine");

-- CreateIndex
CREATE INDEX "TemplateRigaOfferta_tipoOffertaId_idx" ON "TemplateRigaOfferta"("tipoOffertaId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateRigaOfferta_tipoOffertaId_ordine_key" ON "TemplateRigaOfferta"("tipoOffertaId", "ordine");

-- CreateIndex
CREATE UNIQUE INDEX "Offerta_codice_key" ON "Offerta"("codice");

-- CreateIndex
CREATE INDEX "Offerta_stato_dataScadenzaCliente_idx" ON "Offerta"("stato", "dataScadenzaCliente");

-- CreateIndex
CREATE INDEX "Offerta_clienteId_idx" ON "Offerta"("clienteId");

-- CreateIndex
CREATE INDEX "Offerta_kamId_idx" ON "Offerta"("kamId");

-- CreateIndex
CREATE INDEX "Offerta_dataRichiesta_idx" ON "Offerta"("dataRichiesta");

-- CreateIndex
CREATE INDEX "Attivita_personaId_dataInizio_dataFine_idx" ON "Attivita"("personaId", "dataInizio", "dataFine");

-- CreateIndex
CREATE INDEX "Attivita_offertaId_ordine_idx" ON "Attivita"("offertaId", "ordine");

-- CreateIndex
CREATE INDEX "Attivita_stato_idx" ON "Attivita"("stato");

-- CreateIndex
CREATE INDEX "Attivita_dataInizio_dataFine_idx" ON "Attivita"("dataInizio", "dataFine");

-- CreateIndex
CREATE INDEX "Dipendenza_successoreId_idx" ON "Dipendenza"("successoreId");

-- CreateIndex
CREATE UNIQUE INDEX "Dipendenza_predecessoreId_successoreId_key" ON "Dipendenza"("predecessoreId", "successoreId");

-- CreateIndex
CREATE INDEX "Indisponibilita_personaId_dataInizio_dataFine_idx" ON "Indisponibilita"("personaId", "dataInizio", "dataFine");

-- CreateIndex
CREATE INDEX "Indisponibilita_dataInizio_dataFine_idx" ON "Indisponibilita"("dataInizio", "dataFine");

-- CreateIndex
CREATE INDEX "Revisione_offertaId_idx" ON "Revisione"("offertaId");

-- CreateIndex
CREATE UNIQUE INDEX "Revisione_offertaId_numero_key" ON "Revisione"("offertaId", "numero");

-- CreateIndex
CREATE INDEX "EventoAudit_entita_entitaId_creatoIl_idx" ON "EventoAudit"("entita", "entitaId", "creatoIl");

-- CreateIndex
CREATE INDEX "EventoAudit_creatoIl_idx" ON "EventoAudit"("creatoIl");

-- AddForeignKey
ALTER TABLE "TemplateRigaOfferta" ADD CONSTRAINT "TemplateRigaOfferta_tipoOffertaId_fkey" FOREIGN KEY ("tipoOffertaId") REFERENCES "TipoOfferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateRigaOfferta" ADD CONSTRAINT "TemplateRigaOfferta_tipoAttivitaId_fkey" FOREIGN KEY ("tipoAttivitaId") REFERENCES "TipoAttivita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offerta" ADD CONSTRAINT "Offerta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offerta" ADD CONSTRAINT "Offerta_kamId_fkey" FOREIGN KEY ("kamId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offerta" ADD CONSTRAINT "Offerta_tipoOffertaId_fkey" FOREIGN KEY ("tipoOffertaId") REFERENCES "TipoOfferta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attivita" ADD CONSTRAINT "Attivita_offertaId_fkey" FOREIGN KEY ("offertaId") REFERENCES "Offerta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attivita" ADD CONSTRAINT "Attivita_tipoAttivitaId_fkey" FOREIGN KEY ("tipoAttivitaId") REFERENCES "TipoAttivita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attivita" ADD CONSTRAINT "Attivita_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dipendenza" ADD CONSTRAINT "Dipendenza_predecessoreId_fkey" FOREIGN KEY ("predecessoreId") REFERENCES "Attivita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dipendenza" ADD CONSTRAINT "Dipendenza_successoreId_fkey" FOREIGN KEY ("successoreId") REFERENCES "Attivita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indisponibilita" ADD CONSTRAINT "Indisponibilita_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revisione" ADD CONSTRAINT "Revisione_offertaId_fkey" FOREIGN KEY ("offertaId") REFERENCES "Offerta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revisione" ADD CONSTRAINT "Revisione_attivitaId_fkey" FOREIGN KEY ("attivitaId") REFERENCES "Attivita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

