import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  state: null as { [key: string]: unknown } | null,
  createClientCalls: 0,
  analyticsBlobs: [] as Array<{ pathname: string }>,
  repositoryConfigured: false,
  repositoryFiles: {} as Record<string, string>,
}));

vi.mock("@vercel/blob", () => ({
  put: async (pathname: string) => {
    const existing = database.analyticsBlobs.find((blob) => blob.pathname === pathname);
    if (!existing) database.analyticsBlobs.push({ pathname });
    return { pathname };
  },
  list: async ({ prefix }: { prefix: string }) => ({
    blobs: database.analyticsBlobs.filter((blob) => blob.pathname.startsWith(prefix)),
    cursor: undefined,
  }),
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

vi.mock("../lib/github-repository", () => ({
  GitHubRepositoryError: class GitHubRepositoryError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  },
  isRepositoryConfigured: () => database.repositoryConfigured,
  readRepositoryJson: async (path: string) => {
    const value = database.repositoryFiles[path];
    return value ? JSON.parse(value) : null;
  },
  publishRepositoryFiles: async (files: Array<{ path: string; content: string }>) => {
    for (const file of files) database.repositoryFiles[file.path] = file.content;
    return { commit: "test-commit" };
  },
}));

import { handleAdminApi } from "../lib/admin-api";
import { applyManagedCatalogProducts, PRODUCTS } from "../lib/catalog";

const testPassword = "S3cure-test-password!";

beforeEach(() => {
  database.state = null;
  database.createClientCalls = 0;
  database.analyticsBlobs = [];
  database.repositoryConfigured = false;
  database.repositoryFiles = {};
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

  it("persists encrypted admin credential updates and invalidates existing sessions", async () => {
    database.repositoryConfigured = true;
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

    const update = await handleAdminApi(
      new Request("https://example.com/api/admin/account", {
        method: "POST",
        headers: { cookie: sessionCookie, "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: testPassword,
          displayName: "AutoUp Owner",
          username: "autoup.owner",
          email: "owner@example.com",
          newPassword: "Another-Secure-Password-27!",
        }),
      }),
      "/api/admin/account",
    );

    expect(update?.status).toBe(200);
    expect(update?.headers.get("set-cookie")).toContain("Max-Age=0");
    const savedAccount = database.repositoryFiles["src/data/admin-account.secure.json"];
    expect(savedAccount).toBeTruthy();
    expect(savedAccount).not.toContain("Another-Secure-Password-27!");
    expect(savedAccount).not.toContain("owner@example.com");

    const oldSession = await handleAdminApi(
      new Request("https://example.com/api/admin/session", { headers: { cookie: sessionCookie } }),
      "/api/admin/session",
    );
    expect(oldSession?.status).toBe(401);

    const nextLogin = await handleAdminApi(
      new Request("https://example.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "owner@example.com",
          password: "Another-Secure-Password-27!",
        }),
      }),
      "/api/admin/login",
    );
    expect(nextLogin?.status).toBe(200);
    expect(await nextLogin?.json()).toMatchObject({
      admin: { name: "AutoUp Owner", username: "autoup.owner", email: "owner@example.com" },
    });
  });

  it("requires the current password and validates credential updates", async () => {
    database.repositoryConfigured = true;
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
    const update = await handleAdminApi(
      new Request("https://example.com/api/admin/account", {
        method: "POST",
        headers: { cookie: sessionCookie, "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: "wrong",
          displayName: "Admin",
          username: "valid.user",
          email: "valid@example.com",
        }),
      }),
      "/api/admin/account",
    );
    expect(update?.status).toBe(401);
  });

  it("supports profile, username, email, password and other-session actions", async () => {
    database.repositoryConfigured = true;
    const login = async (email: string, password: string) => {
      const response = await handleAdminApi(
        new Request("https://example.com/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        }),
        "/api/admin/login",
      );
      if (response?.status !== 200) throw new Error("Expected admin login to succeed.");
      const cookie = response.headers.get("set-cookie")?.split(";")[0];
      if (!cookie) throw new Error("Expected login to set an admin session cookie.");
      return cookie;
    };
    const post = (path: string, cookie: string, body: Record<string, string>) =>
      handleAdminApi(
        new Request(`https://example.com${path}`, {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        path,
      );

    let cookie = await login("admin@example.com", testPassword);
    const profile = await post("/api/admin/account/profile", cookie, {
      displayName: "Store Admin",
      username: "store.admin",
      email: "admin@example.com",
      currentPassword: testPassword,
    });
    expect(profile?.status).toBe(200);
    cookie = await login("admin@example.com", testPassword);

    const username = await post("/api/admin/account/username", cookie, {
      newUsername: "store.owner",
      confirmUsername: "store.owner",
      currentPassword: testPassword,
    });
    expect(username?.status).toBe(200);
    cookie = await login("admin@example.com", testPassword);

    const email = await post("/api/admin/account/email", cookie, {
      newEmail: "owner@example.com",
      confirmEmail: "owner@example.com",
      currentPassword: testPassword,
    });
    expect(email?.status).toBe(200);
    expect(await email?.json()).toMatchObject({
      verification: expect.stringContaining("not configured"),
    });
    cookie = await login("owner@example.com", testPassword);

    const password = await post("/api/admin/account/password", cookie, {
      oldPassword: testPassword,
      newPassword: "Secure-Updated-Password-27!",
      confirmNewPassword: "Secure-Updated-Password-27!",
    });
    expect(password?.status).toBe(200);
    const currentSessionCookie = await login("owner@example.com", "Secure-Updated-Password-27!");
    const otherSessionCookie = await login("owner@example.com", "Secure-Updated-Password-27!");

    const revokeOthers = await post("/api/admin/account/security/sessions", currentSessionCookie, {
      currentPassword: "Secure-Updated-Password-27!",
    });
    expect(revokeOthers?.status).toBe(200);
    const refreshedCookie = revokeOthers?.headers.get("set-cookie")?.split(";")[0];
    if (!refreshedCookie) throw new Error("Expected the current session to be renewed.");

    const currentSession = await handleAdminApi(
      new Request("https://example.com/api/admin/session", {
        headers: { cookie: refreshedCookie },
      }),
      "/api/admin/session",
    );
    const signedOutSession = await handleAdminApi(
      new Request("https://example.com/api/admin/session", {
        headers: { cookie: otherSessionCookie },
      }),
      "/api/admin/session",
    );
    expect(currentSession?.status).toBe(200);
    expect(signedOutSession?.status).toBe(401);
  });

  it("rejects account confirmation mismatches, weak passwords and incorrect old passwords", async () => {
    database.repositoryConfigured = true;
    const login = await handleAdminApi(
      new Request("https://example.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: testPassword }),
      }),
      "/api/admin/login",
    );
    const cookie = login?.headers.get("set-cookie")?.split(";")[0];
    if (!cookie) throw new Error("Expected login to set an admin session cookie.");
    const post = (path: string, body: Record<string, string>) =>
      handleAdminApi(
        new Request(`https://example.com${path}`, {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        path,
      );

    expect((await post("/api/admin/account/username", {
      currentPassword: testPassword,
      newUsername: "new.owner",
      confirmUsername: "different.owner",
    }))?.status).toBe(400);
    expect((await post("/api/admin/account/email", {
      currentPassword: testPassword,
      newEmail: "new@example.com",
      confirmEmail: "different@example.com",
    }))?.status).toBe(400);
    expect((await post("/api/admin/account/password", {
      oldPassword: "incorrect",
      newPassword: "Secure-Updated-Password-27!",
      confirmNewPassword: "Secure-Updated-Password-27!",
    }))?.status).toBe(401);
    expect((await post("/api/admin/account/password", {
      oldPassword: testPassword,
      newPassword: "weak",
      confirmNewPassword: "weak",
    }))?.status).toBe(400);
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
      ["/api/analytics", "GET"],
    ] as const) {
      const response = await handleAdminApi(
        new Request(`https://example.com${pathname}`, { method }),
        pathname,
      );
      expect(response?.status, `${method} ${pathname}`).toBe(401);
    }

    expect(database.createClientCalls).toBe(0);
  });

  it("persists separate, idempotent cart and WhatsApp events for authenticated analytics", async () => {
    const sessionId = "123e4567-e89b-42d3-a456-426614174000";
    const addToCart = {
      eventId: "123e4567-e89b-42d3-a456-426614174001",
      sessionId,
      type: "add_to_cart",
      productIds: ["lifelines-chemx-c2"],
    };
    const whatsappInquiry = {
      eventId: "123e4567-e89b-42d3-a456-426614174002",
      sessionId,
      type: "whatsapp_inquiry",
      productIds: ["lifelines-chemx-c2"],
    };

    for (const event of [addToCart, whatsappInquiry, whatsappInquiry]) {
      const response = await handleAdminApi(
        new Request("https://example.com/api/analytics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(event),
        }),
        "/api/analytics",
      );
      expect(response?.status).toBe(202);
    }

    expect(database.analyticsBlobs).toHaveLength(2);
    expect(database.analyticsBlobs.some((blob) => blob.pathname.includes("/add-to-cart/"))).toBe(
      true,
    );
    expect(
      database.analyticsBlobs.some((blob) => blob.pathname.includes("/whatsapp-inquiry/")),
    ).toBe(true);

    const analytics = await handleAdminApi(
      new Request("https://example.com/api/analytics", {
        headers: { cookie: "autoup_session=invalid" },
      }),
      "/api/analytics",
    );
    expect(analytics?.status).toBe(401);

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

    const response = await handleAdminApi(
      new Request("https://example.com/api/analytics", {
        headers: { cookie: sessionCookie },
      }),
      "/api/analytics",
    );
    const payload = (await response?.json()) as {
      totals: { addToCart: number; whatsappClicks: number; uniqueWhatsAppSessions: number };
      products: Array<{ productId: string; addToCart: number; whatsappInquiries: number }>;
      daily: unknown[];
      monthly: unknown[];
    };
    expect(response?.status).toBe(200);
    expect(payload.totals).toEqual({
      addToCart: 1,
      whatsappClicks: 1,
      uniqueWhatsAppSessions: 1,
    });
    expect(payload.products).toEqual([
      { productId: "lifelines-chemx-c2", addToCart: 1, whatsappInquiries: 1 },
    ]);
    expect(payload.daily).toHaveLength(14);
    expect(payload.monthly).toHaveLength(12);
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
