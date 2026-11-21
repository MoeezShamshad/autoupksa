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
      upsert: async (row: { state: unknown }, options?: { ignoreDuplicates?: boolean }) => {
        if (!options?.ignoreDuplicates || !database.state) {
          database.state = row.state as { [key: string]: unknown };
        }
        return { error: null };
      },
    }),
  }),
}));

import { handleAdminApi } from "../lib/admin-api";
import { applyManagedCatalogProducts, PRODUCTS } from "../lib/catalog";

const testPassword = "S3cure-test-password!";

beforeEach(() => {
  database.state = null;
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  vi.stubEnv("AUTOUP_ADMIN_EMAIL", "admin@example.com");
  vi.stubEnv("AUTOUP_ADMIN_PASSWORD", testPassword);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("admin API", () => {
  it("uses the service role key when the configured session secret is too short", async () => {
    vi.stubEnv("AUTOUP_ADMIN_SESSION_SECRET", "too-short");

    const login = await handleAdminApi(
      new Request("https://example.com/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "admin@example.com", password: testPassword }),
      }),
      "/api/admin/login",
    );

    expect(login?.status).toBe(200);
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
