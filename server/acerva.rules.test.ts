import { describe, expect, it } from "vitest";
import {
  LOAN_DURATION_DAYS,
  MAX_ACTIVE_LOANS,
  MAX_RENEWALS,
  addDaysToDate,
  diffDaysFloor,
} from "./db";

/**
 * ACERVA — Regras de negócio
 *
 * Estas constantes são CONTRATOS do produto. Qualquer mudança aqui
 * tem impacto direto nas validações de empréstimo, renovação e devolução,
 * por isso ficam blindadas com testes.
 */

describe("ACERVA — constantes de negócio", () => {
  it("mantém o prazo de empréstimo em 15 dias", () => {
    expect(LOAN_DURATION_DAYS).toBe(15);
  });

  it("permite no máximo 2 renovações por empréstimo", () => {
    expect(MAX_RENEWALS).toBe(2);
  });

  it("permite no máximo 3 livros simultâneos por leitor", () => {
    expect(MAX_ACTIVE_LOANS).toBe(3);
  });
});

describe("ACERVA — addDaysToDate", () => {
  it("adiciona dias sem mutar a data original", () => {
    const base = new Date("2026-01-10T12:00:00Z");
    const due = addDaysToDate(base, LOAN_DURATION_DAYS);
    expect(due.getTime()).toBeGreaterThan(base.getTime());
    // confere que a base não foi mutada
    expect(base.toISOString()).toBe("2026-01-10T12:00:00.000Z");
    // 15 dias = 15 * 24h em ms
    expect(due.getTime() - base.getTime()).toBe(15 * 24 * 60 * 60 * 1000);
  });

  it("aceita renovação adicionando exatamente mais 15 dias", () => {
    const original = new Date("2026-01-10T00:00:00Z");
    const renewed = addDaysToDate(original, LOAN_DURATION_DAYS);
    expect(renewed.getTime() - original.getTime()).toBe(15 * 24 * 60 * 60 * 1000);
  });
});

describe("ACERVA — diffDaysFloor", () => {
  it("retorna 0 quando a devolução é antes ou igual ao vencimento", () => {
    const due = new Date("2026-01-25T00:00:00Z");
    const onTime = new Date("2026-01-20T00:00:00Z");
    expect(diffDaysFloor(onTime, due)).toBe(0);
    expect(diffDaysFloor(due, due)).toBe(0);
  });

  it("calcula corretamente o número de dias de atraso", () => {
    const due = new Date("2026-01-25T00:00:00Z");
    const late = new Date("2026-01-30T00:00:00Z");
    expect(diffDaysFloor(late, due)).toBe(5);
  });

  it("trunca frações para o inteiro inferior (floor)", () => {
    const due = new Date("2026-01-25T00:00:00Z");
    const lateBy3and12h = new Date("2026-01-28T12:00:00Z");
    // 3 dias e meio → floor → 3
    expect(diffDaysFloor(lateBy3and12h, due)).toBe(3);
  });
});

describe("ACERVA — fluxo simulado de empréstimo", () => {
  it("simula data de devolução para um empréstimo criado hoje", () => {
    const today = new Date("2026-05-08T00:00:00Z");
    const due = addDaysToDate(today, LOAN_DURATION_DAYS);
    expect(due.toISOString().slice(0, 10)).toBe("2026-05-23");
  });

  it("acumula corretamente após duas renovações (cap MAX_RENEWALS)", () => {
    const created = new Date("2026-05-08T00:00:00Z");
    let due = addDaysToDate(created, LOAN_DURATION_DAYS);
    for (let i = 0; i < MAX_RENEWALS; i++) {
      due = addDaysToDate(due, LOAN_DURATION_DAYS);
    }
    // 15 + 15 + 15 = 45 dias após a criação
    expect(due.toISOString().slice(0, 10)).toBe("2026-06-22");
  });

  it("calcula multa por atraso após período total estendido", () => {
    const dueDate = new Date("2026-05-23T00:00:00Z");
    const returnedAt = new Date("2026-05-30T00:00:00Z");
    expect(diffDaysFloor(returnedAt, dueDate)).toBe(7);
  });
});

describe("ACERVA — formato de CPF", () => {
  // Mesmo regex usado em routers.ts
  const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;

  it("aceita CPF com pontuação clássica (000.000.000-00)", () => {
    expect(cpfRegex.test("123.456.789-09")).toBe(true);
  });

  it("aceita CPF apenas com dígitos (11 chars)", () => {
    expect(cpfRegex.test("12345678909")).toBe(true);
  });

  it("rejeita CPFs malformados", () => {
    expect(cpfRegex.test("123.456.789")).toBe(false);
    expect(cpfRegex.test("abcdefghijk")).toBe(false);
    expect(cpfRegex.test("123-456-789-09")).toBe(false);
    expect(cpfRegex.test("")).toBe(false);
  });
});
