import { describe, it, expect, afterEach, vi } from "vitest";
import { getEnv, resetEnvCache } from "./env";

describe("getEnv INNGEST_SIGNING_KEY", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvCache();
  });

  it("allows empty signing key outside production", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/test");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("INNGEST_SIGNING_KEY", "");
    resetEnvCache();
    expect(getEnv().INNGEST_SIGNING_KEY).toBe("");
  });

  it("requires signing key in production", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/test");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INNGEST_SIGNING_KEY", "");
    resetEnvCache();
    expect(() => getEnv()).toThrow(/INNGEST_SIGNING_KEY/);
  });

  it("accepts signing key in production", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/test");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INNGEST_SIGNING_KEY", "signkey-test");
    resetEnvCache();
    expect(getEnv().INNGEST_SIGNING_KEY).toBe("signkey-test");
  });
});
