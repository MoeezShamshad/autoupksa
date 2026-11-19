import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export type AdminProduct = {
  id: string;
  name: string;
  nameAr: string;
  sku: string;
  category: string;
  packageSize: string;
  price: number;
  salePrice?: number;
  stock: number;
  status: "draft" | "published";
  image: string;
  gallery?: string[];
  updatedAt: string;
  createdAt?: string;
  brand: string;
  description: string;
  descriptionAr: string;
  variants?: Array<{
    id: string;
    name: string;
    sku: string;
    packageSize: string;
    price: number;
    stock: number;
  }>;
};

type AdminState = {
  version: number;
  products: AdminProduct[];
  categories: Array<{
    id: string;
    name: string;
    nameAr: string;
    description: string;
    image: string;
    order: number;
    active: boolean;
  }>;
  inquiries: Array<Record<string, unknown>>;
  activity: Array<{ id: string; action: string; detail: string; createdAt: string }>;
  settings: Record<string, unknown>;
  admin: {
    name: string;
    email: string;
    role: string;
    passwordHash: string;
    passwordSalt: string;
    sessionVersion: number;
  };
};

function supabase() {
  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function sessionSecret() {
  const value = process.env["AUTOUP_ADMIN_SESSION_SECRET"];
  if (!value || value.length < 32) {
    throw new Error("AUTOUP_ADMIN_SESSION_SECRET must contain at least 32 characters.");
  }
  return value;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, hash: string) {
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function readState(): Promise<AdminState> {
  const client = supabase();
  const { data, error } = await client
    .from("admin_app_state")
    .select("state")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.state as AdminState;

  const password = process.env["AUTOUP_ADMIN_PASSWORD"];
  const email = process.env["AUTOUP_ADMIN_EMAIL"]?.trim().toLowerCase();
  if (!password || !email) {
    throw new Error(
      "AUTOUP_ADMIN_EMAIL and AUTOUP_ADMIN_PASSWORD are required to initialize the admin account.",
    );
  }

  const hashed = hashPassword(password);
  const initialState: AdminState = {
    version: 1,
    products: [],
    categories: [],
    inquiries: [],
    activity: [],
    settings: { currency: "SAR", whatsapp: "", language: "ar" },
    admin: {
      name: "AutoUp Admin",
      email,
      role: "Super Admin",
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      sessionVersion: 1,
    },
  };
  const { error: insertError } = await client
    .from("admin_app_state")
    .upsert({ id: 1, state: initialState }, { onConflict: "id", ignoreDuplicates: true });
  if (insertError) throw insertError;

  const { data: initialized, error: readError } = await client
    .from("admin_app_state")
    .select("state")
    .eq("id", 1)
    .single();
  if (readError) throw readError;
  return initialized.state as AdminState;
}

async function writeState(state: AdminState) {
  const { error } = await supabase()
    .from("admin_app_state")
    .upsert({ id: 1, state }, { onConflict: "id" });
  if (error) throw error;
}

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...((headers as Record<string, string>) || {}),
    },
  });
}

function getSession(request: Request, admin: AdminState["admin"]) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("autoup_session="))
    ?.slice("autoup_session=".length);
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest();
  const supplied = Buffer.from(signature, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      expiresAt?: number;
      sessionVersion?: number;
    };
    if (
      claims.email !== admin.email ||
      claims.sessionVersion !== admin.sessionVersion ||
      typeof claims.expiresAt !== "number" ||
      claims.expiresAt <= Date.now()
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

function signToken(email: string, expiresAt: number, sessionVersion: number) {
  const payload = Buffer.from(JSON.stringify({ email, expiresAt, sessionVersion }), "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export async function handleAdminApi(request: Request, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith("/api/")) return null;
  try {
    return await handleAdminApiRequest(request, pathname);
  } catch (error) {
    console.error("Admin API request failed:", error);
    return json({ error: "Admin service is unavailable. Check the server configuration." }, 503);
  }
}

async function handleAdminApiRequest(request: Request, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith("/api/")) return null;

  if (pathname === "/api/catalog" && request.method === "GET") {
    const state = await readState();
    return json({
      products: state.products.filter((item) => item.status === "published"),
      categories: state.categories.filter((item) => item.active),
      settings: state.settings,
    });
  }

  if (pathname === "/api/admin/login" && request.method === "POST") {
    try {
      sessionSecret();
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Admin session secret is not configured." },
        503,
      );
    }
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      remember?: boolean;
    };
    const state = await readState();
    const email = (body.email || "").trim().toLowerCase();
    if (
      email !== state.admin.email ||
      !verifyPassword(body.password || "", state.admin.passwordSalt, state.admin.passwordHash)
    ) {
      return json({ error: "Invalid email or password." }, 401);
    }
    const expiresAt = Date.now() + (body.remember ? 30 : 1) * 24 * 60 * 60 * 1000;
    const token = signToken(email, expiresAt, state.admin.sessionVersion || 1);
    state.activity.unshift({
      id: randomBytes(8).toString("hex"),
      action: "Admin login",
      detail: email,
      createdAt: new Date().toISOString(),
    });
    await writeState(state);
    const isHttps = new URL(request.url).protocol === "https:";
    const secure = isHttps ? "; Secure" : "";
    return json(
      { admin: { name: state.admin.name, email: state.admin.email, role: state.admin.role } },
      200,
      {
        "Set-Cookie": `autoup_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${body.remember ? 2592000 : 86400}${secure}`,
      },
    );
  }

  if (pathname === "/api/admin/logout" && request.method === "POST") {
    const isHttps = new URL(request.url).protocol === "https:";
    const secure = isHttps ? "; Secure" : "";
    return json({ success: true }, 200, {
      "Set-Cookie": `autoup_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`,
    });
  }

  const state = await readState();
  if (!getSession(request, state.admin)) return json({ error: "Unauthorized" }, 401);

  if (pathname === "/api/admin/state" && request.method === "GET") {
    return json({
      products: state.products,
      categories: state.categories,
      inquiries: state.inquiries,
      activity: state.activity,
      settings: state.settings,
      admin: { name: state.admin.name, email: state.admin.email, role: state.admin.role },
    });
  }

  if (pathname === "/api/admin/products" && request.method === "POST") {
    const product = (await request.json()) as AdminProduct;
    if (!product.name?.trim() || !product.sku?.trim())
      return json({ error: "Name and SKU are required." }, 400);
    if (
      state.products.some(
        (item) =>
          item.sku.toLowerCase() === product.sku.trim().toLowerCase() && item.id !== product.id,
      )
    ) {
      return json({ error: "SKU already exists." }, 409);
    }
    const now = new Date().toISOString();
    const existing = product.id ? state.products.findIndex((item) => item.id === product.id) : -1;
    const saved = {
      ...product,
      id: product.id || randomBytes(8).toString("hex"),
      createdAt: existing >= 0 ? state.products[existing]?.createdAt || now : now,
      updatedAt: now,
    };
    if (existing >= 0) state.products[existing] = saved;
    else state.products.unshift(saved);
    state.activity.unshift({
      id: randomBytes(8).toString("hex"),
      action: existing >= 0 ? "Product updated" : "Product created",
      detail: `${saved.name} (${saved.sku})`,
      createdAt: now,
    });
    await writeState(state);
    return json(saved);
  }

  if (pathname === "/api/admin/products" && request.method === "DELETE") {
    const body = (await request.json()) as { id?: string };
    const removed = state.products.find((item) => item.id === body.id);
    state.products = state.products.filter((item) => item.id !== body.id);
    state.activity.unshift({
      id: randomBytes(8).toString("hex"),
      action: "Product deleted",
      detail: removed?.name || body.id || "",
      createdAt: new Date().toISOString(),
    });
    await writeState(state);
    return json({ success: true });
  }

  if (pathname === "/api/admin/categories" && request.method === "POST") {
    const category = (await request.json()) as AdminState["categories"][number];
    const existing = state.categories.findIndex((item) => item.id === category.id);
    if (existing >= 0) state.categories[existing] = category;
    else
      state.categories.unshift({ ...category, id: category.id || randomBytes(8).toString("hex") });
    state.activity.unshift({
      id: randomBytes(8).toString("hex"),
      action: "Category updated",
      detail: category.name,
      createdAt: new Date().toISOString(),
    });
    await writeState(state);
    return json(category);
  }

  if (pathname === "/api/admin/password" && request.method === "POST") {
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    if (
      !verifyPassword(
        body.currentPassword || "",
        state.admin.passwordSalt,
        state.admin.passwordHash,
      )
    )
      return json({ error: "Current password is incorrect." }, 400);
    if ((body.newPassword || "").length < 8)
      return json({ error: "New password must be at least 8 characters." }, 400);
    const hashed = hashPassword(body.newPassword || "");
    state.admin.passwordHash = hashed.hash;
    state.admin.passwordSalt = hashed.salt;
    state.admin.sessionVersion = (state.admin.sessionVersion || 1) + 1;
    state.activity.unshift({
      id: randomBytes(8).toString("hex"),
      action: "Password changed",
      detail: state.admin.email,
      createdAt: new Date().toISOString(),
    });
    await writeState(state);
    return json({ success: true });
  }

  if (pathname === "/api/admin/account" && request.method === "POST") {
    const body = (await request.json()) as { name?: string; email?: string };
    state.admin.name = (body.name || state.admin.name).trim();
    state.admin.email = (body.email || state.admin.email).trim().toLowerCase();
    state.activity.unshift({
      id: randomBytes(8).toString("hex"),
      action: "Account updated",
      detail: state.admin.email,
      createdAt: new Date().toISOString(),
    });
    await writeState(state);
    return json({
      success: true,
      admin: { name: state.admin.name, email: state.admin.email, role: state.admin.role },
    });
  }

  return json({ error: "Not found" }, 404);
}
