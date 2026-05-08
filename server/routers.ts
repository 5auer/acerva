import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { userProfiles } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import { categories as categoriesTable, books as booksTable } from "../drizzle/schema";
import {
  addBookCopy,
  addDaysToDate,
  approveVerification,
  blockUser,
  countActiveLoansForUser,
  createBook,
  createLoan,
  dashboardStats,
  diffDaysFloor,
  ensureProfile,
  findAvailableCopy,
  findUserByCpf,
  getActiveLoansByUser,
  getBookById,
  getDb,
  getDocumentsByUserId,
  getLoanById,
  getProfileByUserId,
  getUserById,
  listAllActiveLoans,
  listAllBooksAdmin,
  listCategories,
  listPendingVerifications,
  LOAN_DURATION_DAYS,
  MAX_ACTIVE_LOANS,
  MAX_RENEWALS,
  nextCopyCode,
  rejectVerification,
  renewLoan,
  returnLoan,
  searchBooks,
  submitVerification,
  unblockUser,
} from "./db";
import { storagePut } from "./storage";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ CATALOG (público) ============
  catalog: router({
    listCategories: publicProcedure.query(() => listCategories()),

    search: publicProcedure
      .input(
        z.object({
          query: z.string().optional(),
          categoryId: z.number().int().positive().optional(),
          onlyAvailable: z.boolean().optional(),
        }),
      )
      .query(({ input }) => searchBooks(input)),

    getBook: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const book = await getBookById(input.id);
        if (!book) throw new TRPCError({ code: "NOT_FOUND", message: "Livro não encontrado" });
        return book;
      }),
  }),

  // ============ PROFILE (usuário autenticado) ============
  profile: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      await ensureProfile(ctx.user.id);
      const profile = await getProfileByUserId(ctx.user.id);
      const docs = await getDocumentsByUserId(ctx.user.id);
      return { profile, documents: docs, user: ctx.user };
    }),

    submitVerification: protectedProcedure
      .input(
        z.object({
          cpf: z.string().regex(cpfRegex, "CPF inválido"),
          phone: z.string().min(8, "Telefone obrigatório").max(20),
          address: z.string().min(8, "Endereço obrigatório").max(500),
          identityFile: z.object({
            base64: z.string().min(10),
            mimeType: z.string(),
            fileName: z.string(),
          }),
          addressFile: z.object({
            base64: z.string().min(10),
            mimeType: z.string(),
            fileName: z.string(),
          }),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        const decode = (b64: string) => {
          const cleaned = b64.replace(/^data:[^;]+;base64,/, "");
          return Buffer.from(cleaned, "base64");
        };

        const idBuf = decode(input.identityFile.base64);
        const addrBuf = decode(input.addressFile.base64);

        const safeIdName = input.identityFile.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const safeAddrName = input.addressFile.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

        const identity = await storagePut(
          `verification/${userId}/identity_${safeIdName}`,
          idBuf,
          input.identityFile.mimeType || "application/octet-stream",
        );
        const addrFile = await storagePut(
          `verification/${userId}/address_${safeAddrName}`,
          addrBuf,
          input.addressFile.mimeType || "application/octet-stream",
        );

        await submitVerification(userId, {
          cpf: input.cpf,
          phone: input.phone,
          address: input.address,
          identityFile: identity,
          addressFile: addrFile,
        });

        return { success: true } as const;
      }),
  }),

  // ============ LOANS do próprio usuário ============
  loans: router({
    myActive: protectedProcedure.query(({ ctx }) => getActiveLoansByUser(ctx.user.id)),

    renew: protectedProcedure
      .input(z.object({ loanId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const loan = await getLoanById(input.loanId);
        if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Empréstimo não encontrado" });
        if (loan.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Empréstimo de outro leitor" });
        }
        if (loan.status !== "active") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Empréstimo já encerrado" });
        }
        if (loan.renewalCount >= MAX_RENEWALS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Limite de ${MAX_RENEWALS} renovações atingido. Devolva o livro na biblioteca.`,
          });
        }
        const now = new Date();
        if (loan.dueDate.getTime() < now.getTime()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Empréstimo está em atraso. Procure a biblioteca para regularizar antes de renovar.",
          });
        }

        const newDue = addDaysToDate(loan.dueDate, LOAN_DURATION_DAYS);
        await renewLoan(loan.id, newDue);
        return { success: true, newDueDate: newDue } as const;
      }),
  }),

  // ============ ADMIN (bibliotecária) ============
  admin: router({
    stats: adminProcedure.query(() => dashboardStats()),

    pendingVerifications: adminProcedure.query(async () => {
      const pending = await listPendingVerifications();
      const enriched = await Promise.all(
        pending.map(async (p) => ({
          ...p,
          documents: await getDocumentsByUserId(p.profile.userId),
        })),
      );
      return enriched;
    }),

    approveVerification: adminProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await approveVerification(input.userId);
        return { success: true } as const;
      }),

    rejectVerification: adminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          reason: z.string().min(3).max(500),
        }),
      )
      .mutation(async ({ input }) => {
        await rejectVerification(input.userId, input.reason);
        return { success: true } as const;
      }),

    listBooks: adminProcedure.query(() => listAllBooksAdmin()),

    createBook: adminProcedure
      .input(
        z.object({
          title: z.string().min(1).max(255),
          author: z.string().min(1).max(255),
          categoryId: z.number().int().positive(),
          description: z.string().max(2000).optional(),
          publisher: z.string().max(160).optional(),
          publicationYear: z.number().int().min(1500).max(3000).optional(),
          isbn: z.string().max(32).optional(),
          coverUrl: z.string().url().max(512).optional(),
          initialCopies: z.number().int().min(1).max(20).default(1),
        }),
      )
      .mutation(async ({ input }) => {
        const { initialCopies, ...rest } = input;
        const id = await createBook(rest);
        for (let i = 0; i < initialCopies; i++) {
          const code = await nextCopyCode(id);
          await addBookCopy({ bookId: id, copyCode: code, status: "available" });
        }
        return { success: true, bookId: id } as const;
      }),

    addCopy: adminProcedure
      .input(z.object({ bookId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const code = await nextCopyCode(input.bookId);
        await addBookCopy({ bookId: input.bookId, copyCode: code, status: "available" });
        return { success: true, code } as const;
      }),

    findUserByCpf: adminProcedure
      .input(z.object({ cpf: z.string().regex(cpfRegex, "CPF inválido") }))
      .query(async ({ input }) => {
        const found = await findUserByCpf(input.cpf);
        return found ?? null;
      }),

    createLoan: adminProcedure
      .input(
        z.object({
          userId: z.number().int().positive(),
          bookId: z.number().int().positive(),
          notes: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // 1. usuário existe?
        const user = await getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Leitor não encontrado" });
        const profile = await getProfileByUserId(input.userId);
        if (!profile)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Leitor sem perfil cadastrado",
          });
        // 2. verificado?
        if (profile.verificationStatus !== "verified") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Leitor não está verificado. Aprove o cadastro antes de emprestar.",
          });
        }
        // 3. bloqueado?
        if (profile.isBlocked) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Leitor está bloqueado: ${profile.blockReason ?? "atraso na devolução"}`,
          });
        }
        // 4. limite de empréstimos
        const active = await countActiveLoansForUser(input.userId);
        if (active >= MAX_ACTIVE_LOANS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Limite de ${MAX_ACTIVE_LOANS} livros simultâneos atingido.`,
          });
        }
        // 5. Exemplar disponível?
        const copy = await findAvailableCopy(input.bookId);
        if (!copy) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não há exemplar disponível desta obra.",
          });
        }

        const now = new Date();
        const dueDate = addDaysToDate(now, LOAN_DURATION_DAYS);
        await createLoan({
          userId: input.userId,
          bookId: input.bookId,
          copyId: copy.id,
          loanedAt: now,
          dueDate,
          status: "active",
          renewalCount: 0,
          daysLate: 0,
          loanedByUserId: ctx.user.id,
          notes: input.notes ?? null,
        });

        return { success: true, dueDate } as const;
      }),

    activeLoans: adminProcedure.query(() => listAllActiveLoans()),

    returnLoan: adminProcedure
      .input(
        z.object({
          loanId: z.number().int().positive(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const loan = await getLoanById(input.loanId);
        if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Empréstimo não encontrado" });
        if (loan.status !== "active") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Empréstimo já foi devolvido" });
        }
        const now = new Date();
        const daysLate = diffDaysFloor(now, loan.dueDate);

        await returnLoan(loan.id, now, daysLate, ctx.user.id);

        if (daysLate > 0) {
          await blockUser(
            loan.userId,
            `Devolução com ${daysLate} dia(s) de atraso em ${now.toLocaleDateString("pt-BR")}`,
          );
        }

        return { success: true, daysLate } as const;
      }),

    unblockUser: adminProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await unblockUser(input.userId);
        return { success: true } as const;
      }),

    seedDemoData: adminProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Idempotent: skip if already seeded
      const existingBooks = await db.select().from(booksTable).limit(1);
      if (existingBooks.length > 0) {
        return { success: true, alreadySeeded: true } as const;
      }

      const categorySeed = [
        { name: "Lit. Brasileira", slug: "lit-brasileira" },
        { name: "Lit. Estrangeira", slug: "lit-estrangeira" },
        { name: "Infantojuvenil", slug: "infantojuvenil" },
        { name: "História", slug: "historia" },
        { name: "Romance", slug: "romance" },
        { name: "Poesia", slug: "poesia" },
        { name: "Educação", slug: "educacao" },
        { name: "Cidade de Schroeder", slug: "schroeder" },
      ];
      for (const c of categorySeed) {
        await db.insert(categoriesTable).values(c).onDuplicateKeyUpdate({ set: { name: c.name } });
      }
      const cats = await db.select().from(categoriesTable);
      const catId = (slug: string) => cats.find((c) => c.slug === slug)!.id;

      const bookSeed: Array<{
        title: string;
        author: string;
        categoryId: number;
        publisher?: string;
        publicationYear?: number;
        isbn?: string;
        description?: string;
        copies: number;
      }> = [
        {
          title: "Dom Casmurro",
          author: "Machado de Assis",
          categoryId: catId("lit-brasileira"),
          publisher: "Editora Garnier",
          publicationYear: 1899,
          description: "Romance clássico de Machado de Assis que narra a história de Bento Santiago, mais conhecido como Bentinho, e Capitu, em uma narrativa marcada pelo ciúme e pela ambiguidade.",
          copies: 3,
        },
        {
          title: "Memórias Póstumas de Brás Cubas",
          author: "Machado de Assis",
          categoryId: catId("lit-brasileira"),
          publicationYear: 1881,
          description: "Considerada a obra que inaugurou o realismo no Brasil, narrada por um defunto-autor.",
          copies: 2,
        },
        {
          title: "Capitães da Areia",
          author: "Jorge Amado",
          categoryId: catId("lit-brasileira"),
          publisher: "Companhia das Letras",
          publicationYear: 1937,
          description: "A vida de meninos abandonados nas ruas de Salvador na década de 1930.",
          copies: 2,
        },
        {
          title: "Vidas Secas",
          author: "Graciliano Ramos",
          categoryId: catId("lit-brasileira"),
          publicationYear: 1938,
          description: "A saga de uma família de retirantes do sertão nordestino.",
          copies: 2,
        },
        {
          title: "Grande Sertão: Veredas",
          author: "João Guimarães Rosa",
          categoryId: catId("lit-brasileira"),
          publicationYear: 1956,
          description: "Obra-prima da literatura brasileira sobre o jagunço Riobaldo.",
          copies: 1,
        },
        {
          title: "O Pequeno Príncipe",
          author: "Antoine de Saint-Exupéry",
          categoryId: catId("infantojuvenil"),
          publisher: "Agir",
          publicationYear: 1943,
          description: "Clássico mundial sobre amizade, amor e a perspectiva infantil sobre o mundo adulto.",
          copies: 4,
        },
        {
          title: "O Menino Maluquinho",
          author: "Ziraldo",
          categoryId: catId("infantojuvenil"),
          publisher: "Melhoramentos",
          publicationYear: 1980,
          description: "As aventuras de um menino esperto e cheio de imaginação.",
          copies: 3,
        },
        {
          title: "Reinações de Narizinho",
          author: "Monteiro Lobato",
          categoryId: catId("infantojuvenil"),
          publicationYear: 1931,
          description: "Aventuras no Sítio do Picapau Amarelo.",
          copies: 2,
        },
        {
          title: "Cem Anos de Solidão",
          author: "Gabriel García Márquez",
          categoryId: catId("lit-estrangeira"),
          publicationYear: 1967,
          description: "Saga da família Buendía na fictícia cidade de Macondo.",
          copies: 2,
        },
        {
          title: "O Velho e o Mar",
          author: "Ernest Hemingway",
          categoryId: catId("lit-estrangeira"),
          publicationYear: 1952,
          description: "A luta de um pescador cubano contra um peixe gigante no Caribe.",
          copies: 2,
        },
        {
          title: "1984",
          author: "George Orwell",
          categoryId: catId("lit-estrangeira"),
          publicationYear: 1949,
          description: "Distopia clássica sobre vigilância, controle e totalitarismo.",
          copies: 3,
        },
        {
          title: "História de Schroeder",
          author: "Arquivo Histórico Municipal",
          categoryId: catId("schroeder"),
          publisher: "Prefeitura de Schroeder",
          publicationYear: 2010,
          description: "Compilação sobre a colonização alemã e o desenvolvimento do município de Schroeder, em Santa Catarina.",
          copies: 2,
        },
        {
          title: "Imigração Alemã no Vale do Itajaí",
          author: "Vários autores",
          categoryId: catId("historia"),
          publicationYear: 2005,
          description: "Histórias e relatos da colonização alemã na região do Vale do Itajaí.",
          copies: 2,
        },
        {
          title: "Antologia Poética",
          author: "Carlos Drummond de Andrade",
          categoryId: catId("poesia"),
          publicationYear: 1962,
          description: "Seleção dos melhores poemas do autor.",
          copies: 1,
        },
        {
          title: "Pedagogia do Oprimido",
          author: "Paulo Freire",
          categoryId: catId("educacao"),
          publicationYear: 1968,
          description: "Clássico da pedagogia crítica brasileira.",
          copies: 1,
        },
      ];

      let booksCreated = 0;
      let copiesCreated = 0;
      for (const b of bookSeed) {
        const id = await createBook({
          title: b.title,
          author: b.author,
          categoryId: b.categoryId,
          publisher: b.publisher,
          publicationYear: b.publicationYear,
          isbn: b.isbn,
          description: b.description,
        });
        booksCreated += 1;
        for (let i = 0; i < b.copies; i++) {
          const code = await nextCopyCode(id);
          await addBookCopy({ bookId: id, copyCode: code, status: "available" });
          copiesCreated += 1;
        }
      }

      return { success: true, alreadySeeded: false, booksCreated, copiesCreated } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
