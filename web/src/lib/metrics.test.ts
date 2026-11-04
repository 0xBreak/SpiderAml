import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { safeTarget } from "./metrics";

describe("safeTarget", () => {
  it("keeps addresses and ENS names", () => {
    const evm = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    expect(safeTarget(`  ${evm} `)).toBe(evm);
    expect(safeTarget("TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE")).toBe("TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE");
    expect(safeTarget("vitalik.eth")).toBe("vitalik.eth");
  });
  it("replaces e-mails, names and other text with a marker", () => {
    expect(safeTarget("ivan.petrov@mail.ru")).toBe("[not an address, 19 chars]");
    expect(safeTarget("Иван Петров")).toBe("[not an address, 11 chars]");
    expect(safeTarget("0x123")).toBe("[not an address, 5 chars]");
  });
});
