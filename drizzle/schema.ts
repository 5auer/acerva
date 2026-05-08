import { relations } from "drizzle-orm";
import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Perfil completo do usuário leitor da biblioteca.
 * Separado da tabela `users` para preservar a auth do template.
 */
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  cpf: varchar("cpf", { length: 14 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  // pending = aguardando envio | submitted = aguardando análise | verified | rejected
  verificationStatus: mysqlEnum("verificationStatus", [
    "pending",
    "submitted",
    "verified",
    "rejected",
  ])
    .default("pending")
    .notNull(),
  rejectionReason: text("rejectionReason"),
  // bloqueio por atraso
  isBlocked: boolean("isBlocked").default(false).notNull(),
  blockedUntil: timestamp("blockedUntil"),
  blockReason: text("blockReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Documentos de verificação enviados pelo usuário.
 */
export const verificationDocuments = mysqlTable("verification_documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // tipo: identidade (RG/CNH) ou comprovante de residência
  docType: mysqlEnum("docType", ["identity", "address_proof"]).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type VerificationDocument = typeof verificationDocuments.$inferSelect;
export type InsertVerificationDocument = typeof verificationDocuments.$inferInsert;

/**
 * Categorias do acervo.
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Obra (livro) - representa um título do acervo.
 * Cada livro pode ter vários exemplares físicos (book_copies).
 */
export const books = mysqlTable("books", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }).notNull(),
  categoryId: int("categoryId").notNull(),
  description: text("description"),
  publisher: varchar("publisher", { length: 160 }),
  publicationYear: int("publicationYear"),
  isbn: varchar("isbn", { length: 32 }),
  coverUrl: varchar("coverUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;

/**
 * Exemplares físicos de cada obra.
 */
export const bookCopies = mysqlTable("book_copies", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("bookId").notNull(),
  // tombo/código interno do exemplar
  copyCode: varchar("copyCode", { length: 32 }).notNull().unique(),
  status: mysqlEnum("status", ["available", "loaned", "maintenance"])
    .default("available")
    .notNull(),
  acquiredAt: timestamp("acquiredAt").defaultNow().notNull(),
});

export type BookCopy = typeof bookCopies.$inferSelect;
export type InsertBookCopy = typeof bookCopies.$inferInsert;

/**
 * Empréstimos.
 * - Prazo padrão: 15 dias
 * - Renovação: +15 dias, máx 2 renovações
 * - Devolução: registrada pela bibliotecária
 */
export const loans = mysqlTable("loans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  copyId: int("copyId").notNull(),
  bookId: int("bookId").notNull(),
  loanedAt: timestamp("loanedAt").defaultNow().notNull(),
  dueDate: timestamp("dueDate").notNull(),
  returnedAt: timestamp("returnedAt"),
  renewalCount: int("renewalCount").default(0).notNull(),
  daysLate: int("daysLate").default(0).notNull(),
  status: mysqlEnum("status", ["active", "returned", "overdue"])
    .default("active")
    .notNull(),
  notes: text("notes"),
  // quem registrou o empréstimo / devolução (admin)
  loanedByUserId: int("loanedByUserId"),
  returnedByUserId: int("returnedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = typeof loans.$inferInsert;

// ----------------- Relations -----------------

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  loans: many(loans),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  category: one(categories, {
    fields: [books.categoryId],
    references: [categories.id],
  }),
  copies: many(bookCopies),
}));

export const bookCopiesRelations = relations(bookCopies, ({ one }) => ({
  book: one(books, { fields: [bookCopies.bookId], references: [books.id] }),
}));

export const loansRelations = relations(loans, ({ one }) => ({
  user: one(users, { fields: [loans.userId], references: [users.id] }),
  copy: one(bookCopies, {
    fields: [loans.copyId],
    references: [bookCopies.id],
  }),
  book: one(books, { fields: [loans.bookId], references: [books.id] }),
}));
