import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  state: null as { [key: string]: unknown } | null,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: database.state ? { state: database.state } : null,
            error: null,
          }),
          single: async () => ({
            data: database.state ? { state: database.state } : null,
            error: null,
          }),
        }),
      }),
      upsert: async (
        row: { state: unknown },
        options?: { ignoreDuplicates?: boolean },
      ) => {
        if (!options?.ignoreDuplicates || !database.state) {
          database.state = row.state as { [key: string]: unknown };
        }
        return { error: null };
      },
    }),
  }),
}));

import { handleAdminApi } from "../lib/admin-api";

const testPassword = "S3cure-test-password!";

beforeEach(() => {
  database.state = null;
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  vi.stubEnv("AUTOUP_ADMIN_EMAIL", "admin@example.com");
  vi.stubEnv("AUTOUP_ADMIN_PASSWORD", testPassword);
  vi.stubEnv("AUTOUP_ADMIN_SESSION_SECRET", "test-secret-".repeat(4));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("admin API", () => {
  it("uses a signed session that remains valid across API requests", async () => {
    const login = await handleAdminApi(
      new Request("https://example.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "admin@example.com",
          password: testPassword,
          remember: true,
        }),
      }),
      "/api/admin/login",
    );

    expect(login?.status).toBe(200);
    const sessionCookie = login?.headers.get("set-cookie")?.split(";")[0];
    expect(sessionCookie).toMatch(/^autoup_session=/);
    if (!sessionCookie) throw new Error("Expected login to set an admin session cookie.");

    const stateResponse = await handleAdminApi(
      new Request("https://example.com/api/admin/state", {
        headers: { cookie: sessionCookie },
      }),
      "/api/admin/state",
    );

    expect(stateResponse?.status).toBe(200);
    await expect(stateResponse?.json()).resolves.toMatchObject({
      admin: { email: "admin@example.com" },
    });
  });

  it("does not initialize an admin account with a built-in password", async () => {
    vi.stubEnv("AUTOUP_ADMIN_EMAIL", "");
    vi.stubEnv("AUTOUP_ADMIN_PASSWORD", "");
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await handleAdminApi(
      new Request("https://example.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "admin@autoup.local",
          password: "not-the-configured-password",
        }),
      }),
      "/api/admin/login",
    );

    expect(response?.status).toBe(503);
  });
});
