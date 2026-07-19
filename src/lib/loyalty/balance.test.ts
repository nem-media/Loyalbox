import { describe, it, expect } from "vitest";
import {
  computeBalance,
  stampProgress,
  redemptionStampDelta,
  progressLabel,
} from "./balance";

describe("computeBalance", () => {
  it("summerer stempler (tom = 0)", () => {
    expect(computeBalance([])).toBe(0);
    expect(computeBalance([{ stamps: 1 }, { stamps: 2 }])).toBe(3);
  });

  it("håndterer negative (reversering/nulstilling)", () => {
    expect(computeBalance([{ stamps: 5 }, { stamps: -2 }])).toBe(3);
    expect(computeBalance([{ stamps: 3 }, { stamps: -3 }])).toBe(0);
  });
});

describe("stampProgress", () => {
  it("beregner fremgang", () => {
    const p = stampProgress(7, 10);
    expect(p).toMatchObject({ have: 7, required: 10, remaining: 3, reached: false, percent: 70 });
  });

  it("markerer nået når saldo ≥ krav", () => {
    expect(stampProgress(10, 10).reached).toBe(true);
    expect(stampProgress(12, 10).reached).toBe(true);
    expect(stampProgress(12, 10).percent).toBe(100);
  });

  it("clamper negative og krav < 1", () => {
    expect(stampProgress(-3, 10).have).toBe(0);
    expect(stampProgress(1, 0).required).toBe(1);
  });
});

describe("redemptionStampDelta", () => {
  it("fuld nulstilling trækker hele saldoen", () => {
    // 11 stempler, belønning kræver 10 → nulstil til 0
    expect(redemptionStampDelta(11, 10, false)).toBe(-11);
  });

  it("behold overskydende trækker kun de krævede", () => {
    // 11 stempler, kræver 10 → behold 1
    expect(redemptionStampDelta(11, 10, true)).toBe(-10);
    // Ledger-semantik: 11 + (-10) = 1
    expect(computeBalance([{ stamps: 11 }, { stamps: redemptionStampDelta(11, 10, true) }])).toBe(1);
  });

  it("behold overskydende overtrækker ikke, hvis saldo < krav", () => {
    expect(redemptionStampDelta(3, 10, true)).toBe(-3);
  });
});

describe("progressLabel", () => {
  it("giver menneskelige beskeder", () => {
    expect(progressLabel(stampProgress(10, 10))).toMatch(/klar til indløsning/i);
    expect(progressLabel(stampProgress(9, 10))).toMatch(/kun 1 stempel/i);
    expect(progressLabel(stampProgress(3, 10))).toMatch(/3 ud af 10/i);
  });
});
