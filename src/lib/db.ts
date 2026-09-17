import { PrismaClient } from '@/generated/prisma';

/**
 * Istanza condivisa del client Prisma.
 * In sviluppo Next ricarica i moduli a ogni modifica: senza questa cache si
 * accumulerebbero connessioni fino a esaurire il pool di Postgres.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
