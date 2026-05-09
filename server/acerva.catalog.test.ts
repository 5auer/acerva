import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

/**
 * ACERVA — Categorias e Capa de livro
 *
 * Mockamos os helpers de DB e storage para validar que:
 *  - admin.createCategory normaliza o slug (acentos, espaços, símbolos)
 *  - admin.createCategory rejeita nomes sem caracteres válidos
 *  - admin.setBookCover aceita URL externa, dataURL base64 e clear
 *  - admin.setBookCover rejeita formatos inválidos
 */

vi.mock("./db", async () => {
  const real = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...real,
    getDb: vi.fn(async () => null),
    createCategory: vi.fn(async () => undefined),
    listCategories: vi.fn(async () => [
      {
        id: 42,
        name: "Auto Ajuda",
        slug: "auto-ajuda",
        createdAt: new Date(),
      },
    ]),
    setBookCoverUrl: vi.fn(async () => undefined),
    getBookById: vi.fn(async () => null),
    updateBook: vi.fn(async () => undefined),
  };
});

vi.mock("./storage", () => ({
  storagePut: vi.fn(async (_key: string, _buf: Buffer, _mime: string) => ({
    key: "book-covers/1.jpg",
    url: "/manus-storage/book-covers/1.jpg",
  })),
}));

import { appRouter } from "./routers";
import * as db from "./db";
import * as storage from "./storage";

type AnyUser = NonNullable<TrpcContext["user"]>;

function adminCtx(): TrpcContext {
  const user: AnyUser = {
    id: 1,
    openId: "admin",
    email: "admin@acerva.local",
    name: "Bibliotecária",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("admin.createCategory", () => {
  beforeEach(() => {
    vi.mocked(db.createCategory).mockClear();
  });

  it("gera slug normalizado a partir do nome (acentos e espaços)", async () => {
    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.admin.createCategory({ name: "Auto Ajuda" });
    expect(db.createCategory).toHaveBeenCalledTimes(1);
    expect(db.createCategory).toHaveBeenCalledWith("Auto Ajuda", "auto-ajuda");
    expect(result.success).toBe(true);
    expect(result.category.slug).toBe("auto-ajuda");
  });

  it("rejeita nomes que não geram slug válido (apenas símbolos)", async () => {
    const caller = appRouter.createCaller(adminCtx());
    await expect(caller.admin.createCategory({ name: "@@" })).rejects.toThrow(
      TRPCError,
    );
    expect(db.createCategory).not.toHaveBeenCalled();
  });
});

describe("admin.setBookCover", () => {
  beforeEach(() => {
    vi.mocked(db.setBookCoverUrl).mockClear();
    vi.mocked(storage.storagePut).mockClear();
  });

  it("aceita URL externa e grava direto sem usar storage", async () => {
    const caller = appRouter.createCaller(adminCtx());
    const res = await caller.admin.setBookCover({
      bookId: 9,
      externalUrl: "https://covers.openlibrary.org/b/id/123-L.jpg",
    });
    expect(res.coverUrl).toBe("https://covers.openlibrary.org/b/id/123-L.jpg");
    expect(db.setBookCoverUrl).toHaveBeenCalledWith(
      9,
      "https://covers.openlibrary.org/b/id/123-L.jpg",
    );
    expect(storage.storagePut).not.toHaveBeenCalled();
  });

  it("aceita arquivo via dataURL base64, faz upload no storage e salva url interna", async () => {
    // 1x1 px JPEG dummy em base64
    const dataUrl =
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wgARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABCT/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=";
    const caller = appRouter.createCaller(adminCtx());
    const res = await caller.admin.setBookCover({
      bookId: 9,
      fileBase64: dataUrl,
    });
    expect(storage.storagePut).toHaveBeenCalledTimes(1);
    expect(res.coverUrl).toBe("/manus-storage/book-covers/1.jpg");
    expect(db.setBookCoverUrl).toHaveBeenCalledWith(
      9,
      "/manus-storage/book-covers/1.jpg",
    );
  });

  it("clear remove a capa setando null", async () => {
    const caller = appRouter.createCaller(adminCtx());
    const res = await caller.admin.setBookCover({ bookId: 9, clear: true });
    expect(res.coverUrl).toBeNull();
    expect(db.setBookCoverUrl).toHaveBeenCalledWith(9, null);
    expect(storage.storagePut).not.toHaveBeenCalled();
  });

  it("rejeita arquivo em formato fora de dataURL", async () => {
    const caller = appRouter.createCaller(adminCtx());
    await expect(
      caller.admin.setBookCover({
        bookId: 9,
        fileBase64: "naoEhDataURL",
      }),
    ).rejects.toThrow(TRPCError);
    expect(db.setBookCoverUrl).not.toHaveBeenCalled();
  });

  it("rejeita chamada sem nenhum dos campos (file, url, clear)", async () => {
    const caller = appRouter.createCaller(adminCtx());
    await expect(caller.admin.setBookCover({ bookId: 9 })).rejects.toThrow(
      TRPCError,
    );
  });
});

describe("admin.updateBook", () => {
  beforeEach(() => {
    (db.getBookById as any).mockClear?.();
    (db.updateBook as any).mockClear?.();
  });

  it("atualiza livro com todos os campos válidos", async () => {
    (db.getBookById as any).mockResolvedValueOnce({
      id: 5,
      title: "Old Title",
      author: "Old Author",
      categoryId: 1,
      description: null,
      publisher: null,
      publicationYear: null,
      isbn: null,
      coverUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(adminCtx());
    const result = await caller.admin.updateBook({
      bookId: 5,
      title: "Dom Casmurro",
      author: "Machado de Assis",
      categoryId: 2,
      description: "Uma obra clássica",
      publisher: "Companhia das Letras",
      publicationYear: 1899,
      isbn: "978-8535914849",
    });

    expect(result.success).toBe(true);
    expect(result.bookId).toBe(5);
    expect((db.updateBook as any)).toHaveBeenCalledWith(5, {
      title: "Dom Casmurro",
      author: "Machado de Assis",
      categoryId: 2,
      description: "Uma obra clássica",
      publisher: "Companhia das Letras",
      publicationYear: 1899,
      isbn: "978-8535914849",
    });
  });

  it("normaliza campos opcionais vazios para null", async () => {
    (db.getBookById as any).mockResolvedValueOnce({
      id: 5,
      title: "Old Title",
      author: "Old Author",
      categoryId: 1,
      description: "Old desc",
      publisher: "Old pub",
      publicationYear: 2000,
      isbn: "123",
      coverUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(adminCtx());
    await caller.admin.updateBook({
      bookId: 5,
      title: "New Title",
      author: "New Author",
      categoryId: 1,
      description: "  ", // espaços em branco → null
      publisher: "", // vazio → null
      publicationYear: undefined,
      isbn: null,
    });

    expect((db.updateBook as any)).toHaveBeenCalledWith(5, {
      title: "New Title",
      author: "New Author",
      categoryId: 1,
      description: null,
      publisher: null,
      publicationYear: null,
      isbn: null,
    });
  });

  it("rejeita livro não encontrado", async () => {
    vi.mocked(db.getBookById).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(adminCtx());
    await expect(
      caller.admin.updateBook({
        bookId: 999,
        title: "Title",
        author: "Author",
        categoryId: 1,
      }),
    ).rejects.toThrow(TRPCError);
    expect((db.updateBook as any)).not.toHaveBeenCalled();
  });

  it("rejeita título vazio", async () => {
    (db.getBookById as any).mockResolvedValueOnce({
      id: 5,
      title: "Old",
      author: "Old",
      categoryId: 1,
      description: null,
      publisher: null,
      publicationYear: null,
      isbn: null,
      coverUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(adminCtx());
    await expect(
      caller.admin.updateBook({
        bookId: 5,
        title: "   ", // apenas espaços
        author: "Author",
        categoryId: 1,
      }),
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita autor vazio", async () => {
    (db.getBookById as any).mockResolvedValueOnce({
      id: 5,
      title: "Title",
      author: "Old",
      categoryId: 1,
      description: null,
      publisher: null,
      publicationYear: null,
      isbn: null,
      coverUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(adminCtx());
    await expect(
      caller.admin.updateBook({
        bookId: 5,
        title: "Title",
        author: "", // vazio
        categoryId: 1,
      }),
    ).rejects.toThrow(TRPCError);
  });

  it("rejeita se não for admin", async () => {
    const user: AnyUser = {
      id: 2,
      openId: "reader",
      email: "reader@acerva.local",
      name: "Leitor",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const readerCtx: TrpcContext = {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(readerCtx);
    await expect(
      caller.admin.updateBook({
        bookId: 5,
        title: "Title",
        author: "Author",
        categoryId: 1,
      }),
    ).rejects.toThrow(TRPCError);
  });
});
