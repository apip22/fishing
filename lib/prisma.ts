import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function missingDbProxy() {
  const handler: ProxyHandler<any> = {
    get() {
      throw new Error(
        "Missing DATABASE_URL environment variable. Please set DATABASE_URL in your deployment settings.",
      );
    },
    apply() {
      throw new Error(
        "Missing DATABASE_URL environment variable. Please set DATABASE_URL in your deployment settings.",
      );
    },
  };

  return new Proxy(() => {}, handler) as unknown as PrismaClient;
}

let _prisma: PrismaClient | any;

if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  _prisma = missingDbProxy();
} else {
  _prisma = globalForPrisma.prisma ?? new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _prisma;
  }
}

export const prisma: PrismaClient = _prisma as PrismaClient;
