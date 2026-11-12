import { beforeEach, describe, expect, it, vi } from "vitest";

let ip = "1.1.1.1";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "cf-connecting-ip": ip }) }));
vi.mock("./demo", () => ({ demoEnabled: () => false, demoCall: () => null }));

const { limit } = await import("./data");
const ok = async (bucket: string, n: number) => { try { await limit(bucket, n); return true; } catch (e) { expect((e as { status: number }).status).toBe(429); return false; } };

describe("limit()", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(Date.now() + 3_600_000)); });
  it("blocks one IP after perMinute requests", async () => {
    ip = "2.2.2.2";
    for (let i = 0; i < 3; i++) expect(await ok("t1", 3)).toBe(true);
    expect(await ok("t1", 3)).toBe(false);
  });
  it("site-wide ceiling: many IPs together are stopped at perMinute*20", async () => {
    let passed = 0;
    for (let i = 0; i < 100; i++) { ip = `10.0.${Math.floor(i / 50)}.${i % 50}`; if (await ok("t2", 3)) passed++; }
    expect(passed).toBe(60);
  });
  it("requests refused by the per-IP limit do not eat the site-wide budget (one abuser must not lock everybody out)", async () => {
    ip = "6.6.6.6";
    for (let i = 0; i < 100; i++) await ok("t3", 3);
    ip = "7.7.7.7";
    expect(await ok("t3", 3)).toBe(true);
  });
  it("the window slides after a minute", async () => {
    ip = "3.3.3.3";
    for (let i = 0; i < 3; i++) await ok("t4", 3);
    expect(await ok("t4", 3)).toBe(false);
    vi.setSystemTime(Date.now() + 61_000);
    expect(await ok("t4", 3)).toBe(true);
  });
});
