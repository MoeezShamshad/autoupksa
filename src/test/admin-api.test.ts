import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  state: null as { [key: string]: unknown } | null,
  createClientCalls: 0,
}));

vi.mock("@neondatabase/serverless", () => ({
  neon: () => {
    database.createClientCalls++;
    return async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join("?").toLowerCase();
      if (query.includes("select state")) {
        return database.state ? [{ state: database.state }] : [];
      }
      if (query.includes("do nothing")) {
        if (!database.state) database.state = JSON.parse(values[0] as string);
        return [];
      }
      if (query.includes("do update")) {
        database.state = JSON.parse(values[0] as string);
        return [];
      }
      return [];
    };
  },
}));

import { handleAdminApi } from "../lib/admin-api";
import { applyManagedCatalogProducts, PRODUCTS } from "../lib/catalog";

const testPassword = "S3cure-test-password!";

beforeEach(() => {
  database.state = null;
  database.createClientCalls = 0;
  vi.stubEnv("DATABASE_URL", "postgres://user:pass@example.neon.tech/db");
  vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
  vi.stubEnv("ADMIN_PASSWORD", testPassword);
  vi.stubEnv("ADMIN_SESSION_SECRET", "test-session-secret-".repeat(4));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("admin API", () => {
  it("reports weak session secrets clearly", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "too-short");

    const login = await handleAdminApi(
      new Request("https://example.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: testPassword }),
      }),
      "/api/admin/login",
    );

    expect(login?.status).toBe(503);
    expect(await login?.json()).toEqual({
      error: "ADMIN_SESSION_SECRET must contain at least 32 characters.",
    });
  });

  it("logs in and verifies a session without any Supabase configuration", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const login = await handleAdminApi(
      new Request("https://example.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: testPassword }),
      }),
      "/api/admin/login",
    );

    expect(login?.status).toBe(200);
    expect(login?.headers.get("set-cookie")).toContain("HttpOnly");
    expect(login?.headers.get("set-cookie")).toContain("SameSite=Strict");
    expect(login?.headers.get("set-cookie")).toContain("Secure");
    expect(login?.headers.get("set-cookie")).toContain("Max-Age=86400");
    const sessionCookie = login?.headers.get("set-cookie")?.split(";")[0];
    if (!sessionCookie) throw new Error("Expected login to set an admin session cookie.");

    const session = await handleAdminApi(
      new Request("https://example.com/api/admin/session", {
        headers: { cookie: sessionCookie },
      }),
      "/api/admin/session",
    );

    expect(session?.status).toBe(200);
    expect(database.createClientCalls).toBe(0);
  });

  it("rejects invalid credentials without contacting Supabase", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const response = await handleAdminApi(
      new Request("https://example.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: "wrong-password" }),
      }),
      "/api/admin/login",
    );

    expect(response?.status).toBe(401);
    expect(await response?.json()).toEqual({ error: "Invalid email or password." });
    expect(database.createClientCalls).toBe(0);
  });

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
    expect(login?.headers.get("set-cookie")).toContain("Max-Age=2592000");
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
    const state = (await stateResponse?.json()) as {
      admin: { email: string };
      products: Array<{ id: string; image: string; sku: string; status: string }>;
    };
    expect(state.admin.email).toBe("admin@example.com");
    expect(state.products).toHaveLength(PRODUCTS.length);
    expect(new Set(state.products.map((product) => product.id)).size).toBe(PRODUCTS.length);
    expect(new Set(state.products.map((product) => product.sku.toLowerCase())).size).toBe(
      PRODUCTS.length,
    );
    expect(state.products.every((product) => product.image && product.status === "published")).toBe(
      true,
    );
  });

  it("clears the session cookie on logout", async () => {
    const login = await handleAdminApi(
      new Request("https://example.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: testPassword }),
      }),
      "/api/admin/login",
    );
    const sessionCookie = login?.headers.get("set-cookie")?.split(";")[0];
    if (!sessionCookie) throw new Error("Expected login to set an admin session cookie.");

    const logout = await handleAdminApi(
      new Request("https://example.com/api/admin/logout", {
        method: "POST",
        headers: { cookie: sessionCookie },
      }),
      "/api/admin/logout",
    );

    expect(logout?.status).toBe(200);
    expect(logout?.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(logout?.headers.get("set-cookie")).toContain("HttpOnly");
    const session = await handleAdminApi(
      new Request("https://example.com/api/admin/session"),
      "/api/admin/session",
    );
    expect(session?.status).toBe(401);
  });

  it("rejects an expired signed session", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.setSystemTime(now);

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
    const sessionCookie = login?.headers.get("set-cookie")?.split(";")[0];
    if (!sessionCookie) throw new Error("Expected login to set an admin session cookie.");

    vi.setSystemTime(new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000));
    const session = await handleAdminApi(
      new Request("https://example.com/api/admin/session", {
        headers: { cookie: sessionCookie },
      }),
      "/api/admin/session",
    );

    expect(session?.status).toBe(401);
  });

  it("backfills existing public products into an already initialized admin state", async () => {
    database.state = {
      version: 1,
      catalogSeeded: false,
      products: [],
      categories: [],
      inquiries: [],
      activity: [],
      settings: {},
      admin: {
        name: "AutoUp Admin",
        email: "admin@example.com",
        role: "Super Admin",
        passwordHash: "placeholder",
        passwordSalt: "placeholder",
        sessionVersion: 1,
      },
    };

    const response = await handleAdminApi(
      new Request("https://example.com/api/catalog"),
      "/api/catalog",
    );

    expect(response?.status).toBe(200);
    const payload = (await response?.json()) as { products: Array<{ id: string }> };
    expect(payload.products).toHaveLength(PRODUCTS.length);
    expect(database.state?.["catalogSeeded"]).toBe(true);
  });

  it("applies saved product names and images to the public catalog", () => {
    const product = PRODUCTS[0];
    if (!product) throw new Error("Expected a catalog product.");
    const original = { ...product };

    applyManagedCatalogProducts([
      {
        id: product.slug,
        slug: product.slug,
        name: "Updated catalog name",
        sku: "UPDATED-SKU",
        category: product.category,
        packageType: product.packageType,
        catalogVariants: product.variants,
        packageSize: product.variants.join(", "),
        description: product.description,
        image: "https://example.com/updated-product.webp",
        price: 99,
      },
    ]);

    expect(product.name).toBe("Updated catalog name");
    expect(product.image).toBe("https://example.com/updated-product.webp");
    Object.assign(product, original);
  });

  it("protects admin APIs without requiring Supabase for authorization", async () => {
    vi.stubEnv("DATABASE_URL", "");

    for (const [pathname, method] of [
      ["/api/admin/session", "GET"],
      ["/api/admin/state", "GET"],
      ["/api/admin/products", "POST"],
      ["/api/admin/categories", "POST"],
      ["/api/admin/password", "POST"],
      ["/api/admin/account", "POST"],
      ["/api/admin/media", "POST"],
    ] as const) {
      const response = await handleAdminApi(
        new Request(`https://example.com${pathname}`, { method }),
        pathname,
      );
      expect(response?.status, `${method} ${pathname}`).toBe(401);
    }

    expect(database.createClientCalls).toBe(0);
  });

  it("requires admin credentials from the server environment", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_PASSWORD", "");

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
    expect(await response?.json()).toEqual({
      error: "ADMIN_EMAIL and ADMIN_PASSWORD must be configured.",
    });
  });
});