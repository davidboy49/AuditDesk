import prisma from "./db";

/**
 * Generates the next unique document code using Option B format: [PREFIX]-[YYYY]-[SEQUENCE]
 * Example: AP-2026-0001
 * 
 * @param prefix Document type prefix (e.g., "AP", "ES", "FD", "AR", "DR")
 * @param year Optional year integer. Defaults to current calendar year.
 * @param digits Number of zero-padded digits (default 4).
 */
export async function generateDocumentCode(
  prefix: string = "AP",
  year?: number,
  digits: number = 4
): Promise<string> {
  const targetYear = year || new Date().getFullYear();
  const cleanPrefix = prefix.trim().toUpperCase();
  const key = `${cleanPrefix}-${targetYear}`;

  let currentVal = 1;

  if ((prisma as any).documentSequence) {
    const sequence = await (prisma as any).documentSequence.upsert({
      where: { key },
      update: { currentVal: { increment: 1 } },
      create: { key, currentVal: 1 }
    });
    currentVal = sequence.currentVal;
  } else {
    // Raw SQL fallback for SQLite when dev server holds a cached Prisma client instance
    await prisma.$executeRawUnsafe(
      `INSERT INTO DocumentSequence (key, currentVal, updatedAt) VALUES (?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET currentVal = currentVal + 1, updatedAt = CURRENT_TIMESTAMP`,
      key
    );
    const rows = await prisma.$queryRawUnsafe<Array<{ currentVal: number }>>(
      `SELECT currentVal FROM DocumentSequence WHERE key = ?`,
      key
    );
    currentVal = rows[0]?.currentVal || 1;
  }

  const seqStr = String(currentVal).padStart(digits, "0");
  return `${key}-${seqStr}`;
}

/**
 * Previews the next code that will be assigned without incrementing the database counter.
 */
export async function getNextDocumentCodePreview(
  prefix: string = "AP",
  year?: number,
  digits: number = 4
): Promise<string> {
  const targetYear = year || new Date().getFullYear();
  const cleanPrefix = prefix.trim().toUpperCase();
  const key = `${cleanPrefix}-${targetYear}`;

  let currentVal = 0;

  if ((prisma as any).documentSequence) {
    const seq = await (prisma as any).documentSequence.findUnique({
      where: { key }
    });
    currentVal = seq?.currentVal || 0;
  } else {
    try {
      const rows = await prisma.$queryRawUnsafe<Array<{ currentVal: number }>>(
        `SELECT currentVal FROM DocumentSequence WHERE key = ?`,
        key
      );
      currentVal = rows[0]?.currentVal || 0;
    } catch {
      currentVal = 0;
    }
  }

  const nextVal = currentVal + 1;
  const seqStr = String(nextVal).padStart(digits, "0");
  return `${key}-${seqStr}`;
}
