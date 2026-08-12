import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

export async function ensureMarriageSchema() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'UserProfile'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'UserProfile'
          AND column_name = 'marriedAt'
      ) THEN
        ALTER TABLE "UserProfile" ADD COLUMN "marriedAt" TIMESTAMP(3);
      END IF;
    END
    $$;
  `);
}

export default prisma;
