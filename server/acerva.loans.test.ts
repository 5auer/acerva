import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * Testes de integração de regras dos fluxos de empréstimo, renovação e devolução.
 *
 * Estratégia: stubamos o módulo "./db" inteiro com vi.mock, controlando o que cada
 * helper retorna em cada cenário. Em seguida, importamos `appRouter` e usamos o
 * createCaller para invocar procedures como se fosse um cliente tRPC autenticado.
 */

vi.mock("./db", () => {
  // Stubs reutilizados em cada cenário; cada teste configura via mockResolvedValueOnce.
  return {
    LOAN_DURATION_DAYS: 15,
    MAX_RENEWALS: 2,
    MAX_ACTIVE_LOANS: 3,
    addDaysToDate: (base: Date, days: number) => {
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      return d;
    },
    diffDaysFloor: (later: Date, earlier: Date) => {
      const ms = later.getTime() - earlier.getTime();
      if (ms <= 0) return 0;
      return Math.floor(ms / (1000 * 60 * 60 * 24));
    },

    // Helpers que cada teste reconfigura
    getDb: vi.fn(async () => null),
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getUserById: vi.fn(),
    getProfileByUserId: vi.fn(),
    ensureProfile: vi.fn(),
    updateProfile: vi.fn(),
    submitVerification: vi.fn(),
    getDocumentsByUserId: vi.fn(),
    listPendingVerifications: vi.fn(),
    approveVerification: vi.fn(),
    rejectVerification: vi.fn(),
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    searchBooks: vi.fn(),
    getBookById: vi.fn(),
    listAllBooksAdmin: vi.fn(),
    createBook: vi.fn(),
    addBookCopy: vi.fn(),
    nextCopyCode: vi.fn(),
    findAvailableCopy: vi.fn(),
    getActiveLoansByUser: vi.fn(),
    getLoanById: vi.fn(),
    countActiveLoansForUser: vi.fn(),
    createLoan: vi.fn(),
    renewLoan: vi.fn(),
    returnLoan: vi.fn(),
    listAllActiveLoans: vi.fn(),
    findUserByCpf: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
    dashboardStats: vi.fn(),
  };
});

import * as db from "./db";
import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeAdmin(): AuthenticatedUser {
  return {
    id: 99,
    openId: "admin-open",
    email: "biblio@schroeder.sc.gov.br",
    name: "Bibliotecária",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

function makeReader(id = 7): AuthenticatedUser {
  return {
    id,
    openId: `reader-${id}`,
    email: `leitor${id}@email.com`,
    name: "Leitor Teste",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

function ctxFor(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("admin.createLoan — validações de negócio", () => {
  it("rejeita quando o leitor não está verificado", async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ id: 7 } as never);
    vi.mocked(db.getProfileByUserId).mockResolvedValue({
      userId: 7,
      verificationStatus: "pending",
      isBlocked: false,
    } as never);

    const caller = appRouter.createCaller(ctxFor(makeAdmin()));
    await expect(
      caller.admin.createLoan({ userId: 7, bookId: 1 }),
    ).rejects.toThrow(/não está verificado/i);
  });

  it("rejeita quando o leitor está bloqueado", async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ id: 7 } as never);
    vi.mocked(db.getProfileByUserId).mockResolvedValue({
      userId: 7,
      verificationStatus: "verified",
      isBlocked: true,
      blockReason: "atraso",
    } as never);

    const caller = appRouter.createCaller(ctxFor(makeAdmin()));
    await expect(
      caller.admin.createLoan({ userId: 7, bookId: 1 }),
    ).rejects.toThrow(/bloqueado/i);
  });

  it("rejeita quando o leitor já tem 3 empréstimos ativos", async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ id: 7 } as never);
    vi.mocked(db.getProfileByUserId).mockResolvedValue({
      userId: 7,
      verificationStatus: "verified",
      isBlocked: false,
    } as never);
    vi.mocked(db.countActiveLoansForUser).mockResolvedValue(3);

    const caller = appRouter.createCaller(ctxFor(makeAdmin()));
    await expect(
      caller.admin.createLoan({ userId: 7, bookId: 1 }),
    ).rejects.toThrow(/Limite de 3 livros simult/i);
  });

  it("rejeita quando não há exemplar disponível", async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ id: 7 } as never);
    vi.mocked(db.getProfileByUserId).mockResolvedValue({
      userId: 7,
      verificationStatus: "verified",
      isBlocked: false,
    } as never);
    vi.mocked(db.countActiveLoansForUser).mockResolvedValue(1);
    vi.mocked(db.findAvailableCopy).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctxFor(makeAdmin()));
    await expect(
      caller.admin.createLoan({ userId: 7, bookId: 1 }),
    ).rejects.toThrow(/Não há exemplar disponível/i);
  });

  it("cria empréstimo com prazo de 15 dias quando todas as regras passam", async () => {
    vi.mocked(db.getUserById).mockResolvedValue({ id: 7 } as never);
    vi.mocked(db.getProfileByUserId).mockResolvedValue({
      userId: 7,
      verificationStatus: "verified",
      isBlocked: false,
    } as never);
    vi.mocked(db.countActiveLoansForUser).mockResolvedValue(2);
    vi.mocked(db.findAvailableCopy).mockResolvedValue({ id: 42, bookId: 1 } as never);
    vi.mocked(db.createLoan).mockResolvedValue(undefined as never);

    const caller = appRouter.createCaller(ctxFor(makeAdmin()));
    const result = await caller.admin.createLoan({ userId: 7, bookId: 1 });

    expect(result.success).toBe(true);
    expect(db.createLoan).toHaveBeenCalledOnce();
    const call = vi.mocked(db.createLoan).mock.calls[0]?.[0] as any;
    const diffMs = call.dueDate.getTime() - call.loanedAt.getTime();
    expect(diffMs).toBe(15 * 24 * 60 * 60 * 1000);
    expect(call.copyId).toBe(42);
    expect(call.userId).toBe(7);
    expect(call.renewalCount).toBe(0);
  });

  it("bloqueia uso por usuário não-admin (FORBIDDEN)", async () => {
    const caller = appRouter.createCaller(ctxFor(makeReader()));
    await expect(
      caller.admin.createLoan({ userId: 7, bookId: 1 }),
    ).rejects.toThrow(/permission|FORBIDDEN|admin/i);
  });
});

describe("loans.renew — limite de 2 renovações", () => {
  it("aceita primeira renovação adicionando 15 dias à due date original", async () => {
    const due = new Date("2026-06-01T00:00:00Z");
    vi.mocked(db.getLoanById).mockResolvedValue({
      id: 11,
      userId: 7,
      status: "active",
      renewalCount: 0,
      dueDate: due,
    } as never);
    vi.mocked(db.renewLoan).mockResolvedValue(undefined as never);

    // Garante que dueDate > now no teste
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-25T00:00:00Z"));

    const caller = appRouter.createCaller(ctxFor(makeReader(7)));
    const result = await caller.loans.renew({ loanId: 11 });

    expect(result.success).toBe(true);
    const newDue: Date = result.newDueDate;
    expect(newDue.getTime() - due.getTime()).toBe(15 * 24 * 60 * 60 * 1000);

    vi.useRealTimers();
  });

  it("rejeita quando já atingiu MAX_RENEWALS (2)", async () => {
    vi.mocked(db.getLoanById).mockResolvedValue({
      id: 11,
      userId: 7,
      status: "active",
      renewalCount: 2,
      dueDate: new Date("2026-06-01T00:00:00Z"),
    } as never);

    const caller = appRouter.createCaller(ctxFor(makeReader(7)));
    await expect(caller.loans.renew({ loanId: 11 })).rejects.toThrow(
      /Limite de 2 renova/i,
    );
  });

  it("rejeita renovação quando já está em atraso", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T00:00:00Z"));

    vi.mocked(db.getLoanById).mockResolvedValue({
      id: 11,
      userId: 7,
      status: "active",
      renewalCount: 0,
      dueDate: new Date("2026-06-01T00:00:00Z"), // já venceu
    } as never);

    const caller = appRouter.createCaller(ctxFor(makeReader(7)));
    await expect(caller.loans.renew({ loanId: 11 })).rejects.toThrow(/atraso/i);

    vi.useRealTimers();
  });

  it("não permite renovar empréstimo de outro leitor", async () => {
    vi.mocked(db.getLoanById).mockResolvedValue({
      id: 11,
      userId: 999, // outro
      status: "active",
      renewalCount: 0,
      dueDate: new Date("2030-01-01T00:00:00Z"),
    } as never);

    const caller = appRouter.createCaller(ctxFor(makeReader(7)));
    await expect(caller.loans.renew({ loanId: 11 })).rejects.toThrow(
      /outro leitor|permission|FORBIDDEN/i,
    );
  });
});

describe("admin.returnLoan — devolução, atraso e bloqueio", () => {
  it("registra devolução sem atraso (não bloqueia leitor)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T00:00:00Z"));

    vi.mocked(db.getLoanById).mockResolvedValue({
      id: 33,
      userId: 7,
      copyId: 42,
      status: "active",
      dueDate: new Date("2026-05-25T00:00:00Z"),
    } as never);
    vi.mocked(db.returnLoan).mockResolvedValue(undefined as never);
    vi.mocked(db.blockUser).mockResolvedValue(undefined as never);

    const caller = appRouter.createCaller(ctxFor(makeAdmin()));
    const result = await caller.admin.returnLoan({ loanId: 33 });

    expect(result.success).toBe(true);
    expect(result.daysLate).toBe(0);
    expect(db.returnLoan).toHaveBeenCalledOnce();
    expect(db.blockUser).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("registra devolução com atraso e BLOQUEIA o leitor automaticamente", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));

    vi.mocked(db.getLoanById).mockResolvedValue({
      id: 33,
      userId: 7,
      copyId: 42,
      status: "active",
      dueDate: new Date("2026-05-25T00:00:00Z"),
    } as never);
    vi.mocked(db.returnLoan).mockResolvedValue(undefined as never);
    vi.mocked(db.blockUser).mockResolvedValue(undefined as never);

    const caller = appRouter.createCaller(ctxFor(makeAdmin()));
    const result = await caller.admin.returnLoan({ loanId: 33 });

    expect(result.success).toBe(true);
    expect(result.daysLate).toBe(7); // 7 dias de atraso
    expect(db.blockUser).toHaveBeenCalledOnce();
    const blockArgs = vi.mocked(db.blockUser).mock.calls[0];
    expect(blockArgs?.[0]).toBe(7); // userId
    expect(String(blockArgs?.[1])).toMatch(/atraso/i);

    vi.useRealTimers();
  });

  it("rejeita devolução de empréstimo já encerrado", async () => {
    vi.mocked(db.getLoanById).mockResolvedValue({
      id: 33,
      userId: 7,
      copyId: 42,
      status: "returned",
      dueDate: new Date("2026-05-25T00:00:00Z"),
    } as never);

    const caller = appRouter.createCaller(ctxFor(makeAdmin()));
    await expect(caller.admin.returnLoan({ loanId: 33 })).rejects.toThrow(
      /já foi devolvido/i,
    );
  });

  it("rejeita uso por leitor comum (FORBIDDEN)", async () => {
    const caller = appRouter.createCaller(ctxFor(makeReader()));
    await expect(caller.admin.returnLoan({ loanId: 33 })).rejects.toThrow(
      /permission|FORBIDDEN|admin/i,
    );
  });
});
