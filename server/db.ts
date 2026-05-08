import { and, asc, desc, eq, ilike, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  bookCopies,
  books,
  categories,
  InsertBook,
  InsertBookCopy,
  InsertLoan,
  InsertUser,
  InsertUserProfile,
  InsertVerificationDocument,
  loans,
  userProfiles,
  users,
  verificationDocuments,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ========== USERS ==========

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });

    // Garantir profile
    const created = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    if (created.length > 0) {
      const userId = created[0].id;
      const existing = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);
      if (existing.length === 0) {
        // se for o owner, marca como verified automaticamente
        const isOwner = user.openId === ENV.ownerOpenId;
        await db.insert(userProfiles).values({
          userId,
          verificationStatus: isOwner ? "verified" : "pending",
        });
      }
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

// ========== USER PROFILE ==========

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return result[0];
}

export async function ensureProfile(userId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await getProfileByUserId(userId);
  if (!existing) {
    await db.insert(userProfiles).values({ userId, verificationStatus: "pending" });
  }
}

export async function updateProfile(userId: number, patch: Partial<InsertUserProfile>) {
  const db = await getDb();
  if (!db) return;
  await ensureProfile(userId);
  await db.update(userProfiles).set(patch).where(eq(userProfiles.userId, userId));
}

export async function submitVerification(
  userId: number,
  data: {
    cpf: string;
    phone: string;
    address: string;
    identityFile: { key: string; url: string };
    addressFile: { key: string; url: string };
  },
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await ensureProfile(userId);
  await db
    .update(userProfiles)
    .set({
      cpf: data.cpf,
      phone: data.phone,
      address: data.address,
      verificationStatus: "submitted",
      rejectionReason: null,
    })
    .where(eq(userProfiles.userId, userId));

  // Limpar docs antigos do usuário
  await db.delete(verificationDocuments).where(eq(verificationDocuments.userId, userId));

  await db.insert(verificationDocuments).values([
    {
      userId,
      docType: "identity",
      fileKey: data.identityFile.key,
      fileUrl: data.identityFile.url,
    },
    {
      userId,
      docType: "address_proof",
      fileKey: data.addressFile.key,
      fileUrl: data.addressFile.url,
    },
  ]);
}

export async function getDocumentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(verificationDocuments)
    .where(eq(verificationDocuments.userId, userId));
}

export async function listPendingVerifications() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      profile: userProfiles,
      user: users,
    })
    .from(userProfiles)
    .innerJoin(users, eq(users.id, userProfiles.userId))
    .where(eq(userProfiles.verificationStatus, "submitted"))
    .orderBy(asc(userProfiles.updatedAt));
}

export async function approveVerification(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userProfiles)
    .set({ verificationStatus: "verified", rejectionReason: null })
    .where(eq(userProfiles.userId, userId));
}

export async function rejectVerification(userId: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userProfiles)
    .set({ verificationStatus: "rejected", rejectionReason: reason })
    .where(eq(userProfiles.userId, userId));
}

// ========== CATEGORIES ==========

export async function listCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function createCategory(name: string, slug: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(categories).values({ name, slug }).onDuplicateKeyUpdate({
    set: { name },
  });
}

// ========== BOOKS ==========

export async function searchBooks(params: {
  query?: string;
  categoryId?: number;
  onlyAvailable?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const q = (params.query ?? "").trim();

  // Subquery para contar disponíveis por livro
  const conditions = [] as any[];
  if (q.length > 0) {
    const like_q = `%${q}%`;
    conditions.push(
      or(like(books.title, like_q), like(books.author, like_q)),
    );
  }
  if (params.categoryId) {
    conditions.push(eq(books.categoryId, params.categoryId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      book: books,
      category: categories,
      totalCopies: sql<number>`COUNT(${bookCopies.id})`,
      availableCopies: sql<number>`SUM(CASE WHEN ${bookCopies.status} = 'available' THEN 1 ELSE 0 END)`,
    })
    .from(books)
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .leftJoin(bookCopies, eq(bookCopies.bookId, books.id))
    .where(where as any)
    .groupBy(books.id, categories.id)
    .orderBy(asc(books.title));

  let result = rows.map((r) => ({
    ...r.book,
    category: r.category,
    totalCopies: Number(r.totalCopies ?? 0),
    availableCopies: Number(r.availableCopies ?? 0),
  }));

  if (params.onlyAvailable) {
    result = result.filter((r) => r.availableCopies > 0);
  }

  return result;
}

export async function getBookById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({
      book: books,
      category: categories,
    })
    .from(books)
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .where(eq(books.id, id))
    .limit(1);

  if (rows.length === 0) return undefined;

  const copies = await db.select().from(bookCopies).where(eq(bookCopies.bookId, id));

  return {
    ...rows[0].book,
    category: rows[0].category,
    copies,
    totalCopies: copies.length,
    availableCopies: copies.filter((c) => c.status === "available").length,
  };
}

export async function listAllBooksAdmin() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      book: books,
      category: categories,
      totalCopies: sql<number>`COUNT(${bookCopies.id})`,
      availableCopies: sql<number>`SUM(CASE WHEN ${bookCopies.status} = 'available' THEN 1 ELSE 0 END)`,
    })
    .from(books)
    .leftJoin(categories, eq(categories.id, books.categoryId))
    .leftJoin(bookCopies, eq(bookCopies.bookId, books.id))
    .groupBy(books.id, categories.id)
    .orderBy(asc(books.title));
  return rows.map((r) => ({
    ...r.book,
    category: r.category,
    totalCopies: Number(r.totalCopies ?? 0),
    availableCopies: Number(r.availableCopies ?? 0),
  }));
}

export async function createBook(input: InsertBook): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(books).values(input);
  // mysql2: insertId em result[0].insertId
  // drizzle returns ResultSetHeader-like
  const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return Number(insertId);
}

export async function setBookCoverUrl(bookId: number, coverUrl: string | null) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(books).set({ coverUrl }).where(eq(books.id, bookId));
}

export async function addBookCopy(input: InsertBookCopy) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(bookCopies).values(input);
}

export async function nextCopyCode(bookId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(bookCopies).where(eq(bookCopies.bookId, bookId));
  const num = existing.length + 1;
  return `LIV${String(bookId).padStart(4, "0")}-${String(num).padStart(2, "0")}`;
}

export async function findAvailableCopy(bookId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(bookCopies)
    .where(and(eq(bookCopies.bookId, bookId), eq(bookCopies.status, "available")))
    .limit(1);
  return rows[0];
}

// ========== LOANS ==========

export async function getActiveLoansByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      loan: loans,
      book: books,
      copy: bookCopies,
    })
    .from(loans)
    .innerJoin(books, eq(books.id, loans.bookId))
    .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
    .where(and(eq(loans.userId, userId), eq(loans.status, "active")))
    .orderBy(asc(loans.dueDate));
}

export async function getLoanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(loans).where(eq(loans.id, id)).limit(1);
  return rows[0];
}

export async function countActiveLoansForUser(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(loans)
    .where(and(eq(loans.userId, userId), eq(loans.status, "active")));
  return Number(rows[0]?.c ?? 0);
}

export async function createLoan(input: InsertLoan) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(loans).values(input);
  await db
    .update(bookCopies)
    .set({ status: "loaned" })
    .where(eq(bookCopies.id, input.copyId));
}

export async function renewLoan(loanId: number, newDueDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .update(loans)
    .set({
      dueDate: newDueDate,
      renewalCount: sql`${loans.renewalCount} + 1`,
    })
    .where(eq(loans.id, loanId));
}

export async function returnLoan(
  loanId: number,
  returnedAt: Date,
  daysLate: number,
  returnedByUserId: number,
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const loan = await getLoanById(loanId);
  if (!loan) throw new Error("Empréstimo não encontrado");

  await db
    .update(loans)
    .set({
      status: "returned",
      returnedAt,
      daysLate,
      returnedByUserId,
    })
    .where(eq(loans.id, loanId));

  await db
    .update(bookCopies)
    .set({ status: "available" })
    .where(eq(bookCopies.id, loan.copyId));
}

export async function listAllActiveLoans() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      loan: loans,
      book: books,
      copy: bookCopies,
      user: users,
      profile: userProfiles,
    })
    .from(loans)
    .innerJoin(books, eq(books.id, loans.bookId))
    .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
    .innerJoin(users, eq(users.id, loans.userId))
    .leftJoin(userProfiles, eq(userProfiles.userId, loans.userId))
    .where(eq(loans.status, "active"))
    .orderBy(asc(loans.dueDate));
}

export async function findUserByCpf(cpf: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ user: users, profile: userProfiles })
    .from(userProfiles)
    .innerJoin(users, eq(users.id, userProfiles.userId))
    .where(eq(userProfiles.cpf, cpf))
    .limit(1);
  return rows[0];
}

export async function blockUser(userId: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userProfiles)
    .set({ isBlocked: true, blockReason: reason })
    .where(eq(userProfiles.userId, userId));
}

export async function unblockUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userProfiles)
    .set({ isBlocked: false, blockReason: null, blockedUntil: null })
    .where(eq(userProfiles.userId, userId));
}

export async function dashboardStats() {
  const db = await getDb();
  if (!db)
    return {
      totalBooks: 0,
      totalCopies: 0,
      activeLoans: 0,
      pendingVerifications: 0,
      verifiedReaders: 0,
    };

  const [bookCount] = await db.select({ c: sql<number>`COUNT(*)` }).from(books);
  const [copyCount] = await db.select({ c: sql<number>`COUNT(*)` }).from(bookCopies);
  const [activeLoanCount] = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(loans)
    .where(eq(loans.status, "active"));
  const [pendingCount] = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(userProfiles)
    .where(eq(userProfiles.verificationStatus, "submitted"));
  const [verifiedCount] = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(userProfiles)
    .where(eq(userProfiles.verificationStatus, "verified"));

  return {
    totalBooks: Number(bookCount?.c ?? 0),
    totalCopies: Number(copyCount?.c ?? 0),
    activeLoans: Number(activeLoanCount?.c ?? 0),
    pendingVerifications: Number(pendingCount?.c ?? 0),
    verifiedReaders: Number(verifiedCount?.c ?? 0),
  };
}

// ========== Helpers ==========

export const LOAN_DURATION_DAYS = 15;
export const MAX_RENEWALS = 2;
export const MAX_ACTIVE_LOANS = 3;

export function addDaysToDate(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function diffDaysFloor(later: Date, earlier: Date): number {
  const ms = later.getTime() - earlier.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
