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

if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  // In production without DATABASE_URL, export a proxy that throws a clear error
  // when any prisma operation is attempted. This yields a clearer runtime
  // message instead of obscure stack traces.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - intentional proxy fallback
  export const prisma = missingDbProxy();
} else {
  export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
}