// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não está definida no ambiente.");
  }
  // Use o PrismaClient padrão, ele se conecta diretamente via DATABASE_URL
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}