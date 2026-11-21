import { createHash, randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { CATEGORIES, PRODUCTS } from "./catalog";
import { translateText } from "./i18n";

export type AdminProduct = {
  id: string;
  slug?: string;
  name: string;
  nameAr: string;
  sku: string;
  category: string;
  packageSize: string;
  catalogVariants?: string[];
  packageType?: "retail" | "gallon" | "other-commercial";
  code?: string;
  short?: string;
  usage?: string;
  featured?: number;
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
  catalogSeeded?: boolean;
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

type AdminCredentials = {
  email: string;
  password: string;
  sessionSecret: string;
};

function supabase() {
  const url = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for persistent admin data.",
    );
  }
  return createClient(url, serviceRoleKey);
}

function getAdminCredentials(): AdminCredentials {
  const email = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
  const password = process.env["ADMIN_PASSWORD"];
  const sessionSecret = process.env["ADMIN_SESSION_SECRET"];
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured.");
  }
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  }
  return { email, password, sessionSecret };
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function credentialVersion(credentials: AdminCredentials) {
  return createHmac("sha256", credentials.sessionSecret)
    .update(`${credentials.email}\0${credentials.password}`)
    .digest("hex");
}

function catalogProducts(): AdminProduct[] {
  return PRODUCTS.map((product) => {
    const packageSize = product.variants.join(", ");
    const sku = product.code
      ? `${product.code.replace(/[^a-z0-9]+/gi, "-")}-${packageSize.replace(/[^a-z0-9]+/gi, "")}`
      : product.slug;
    return {
      id: product.slug,
      slug: product.slug,
      name: product.name,
      nameAr: translateText(product.name, "ar"),
      sku,
      category: product.category,
      packageSize,
      catalogVariants: product.variants,
      packageType: product.packageType,
      code: product.code || "",
      short: product.short,
      usage: product.usage,
      featured: product.featured,
      price: product.price ?? 0,
      stock: 0,
      status: "published",
      image: product.image,
      updatedAt: new Date().toISOString(),
      brand: "LifeLines",
      description: product.description,
      descriptionAr: translateText(product.description, "ar"),
      variants: product.variants.map((variant, index) => ({
        id: `${product.slug}-${index + 1}`,
        name: product.name,
        sku,
        packageSize: variant,
        price: product.price ?? 0,
        stock: 0,
      })),
    };
  });
}

function catalogCategories(): AdminState["categories"] {
  return CATEGORIES.filter((category) => category !== "All Products").map((name, order) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    nameAr: translateText(name, "ar"),
    description: "",
    image: "",
    order,
    active: true,
  }));
}

async function readState(): Promise<AdminState> {
  const client = supabase();
  const { data, error } = await client
    .from("admin_app_state")
    .select("state")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    const state = data.state as AdminState;
    if (!state.catalogSeeded) {
      const existingProductIds = new Set(
        state.products.flatMap((product) => [product.id, product.slug].filter(Boolean)),
      );
      state.products.push(
        ...catalogProducts().filter(
          (product) => !existingProductIds.has(product.id) && !existingProductIds.has(product.slug),
        ),
      );
      const existingCategories = new Set(
        state.categories.map((category) => category.name.toLowerCase()),
      );
      state.categories.unshift(
        ...catalogCategories().filter(
          (category) => !existingCategories.has(category.name.toLowerCase()),
        ),
      );
      state.catalogSeeded = true;
      await writeState(state);
    }
    return state;
  }

  const password = process.env["ADMIN_PASSWORD"];
  const email = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
  if (!password || !email) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required to initialize the admin account.",
    );
  }

  const hashed = hashPassword(password);
  const initialState: AdminState = {
    version: 1,
    catalogSeeded: true,
    products: catalogProducts(),
    categories: catalogCategories(),
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

function getSession(request: Request, credentials: AdminCredentials) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("autoup_session="))
    ?.slice("autoup_session=".length);
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (extra !== undefined) return null;
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", credentials.sessionSecret).update(payload).digest();
  const supplied = Buffer.from(signature, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      expiresAt?: number;
      credentialVersion?: string;
    };
    if (
      claims.email !== credentials.email ||
      claims.credentialVersion !== credentialVersion(credentials) ||
      typeof claims.expiresAt !== "number" ||
      !Number.isSafeInteger(claims.expiresAt) ||
      claims.expiresAt <= Date.now()
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

function signToken(credentials: AdminCredentials, expiresAt: number) {
  const payload = Buffer.from(
    JSON.stringify({
      email: credentials.email,
      expiresAt,
      credentialVersion: credentialVersion(credentials),
    }),
    "utf8",
  ).toString("base64url");
  const signature = createHmac("sha256", credentials.sessionSecret).update(payload).digest("hex");
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
    let credentials: AdminCredentials;
    try {
      credentials = getAdminCredentials();
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Admin authentication is not configured.",
        },
        503,
      );
    }
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      remember?: boolean;
    };
    const email = (body.email || "").trim().toLowerCase();
    const suppliedPasswordHash = createHash("sha256").update(body.password || "").digest();
    const configuredPasswordHash = createHash("sha256").update(credentials.password).digest();
    if (email !== credentials.email || !timingSafeEqual(suppliedPasswordHash, configuredPasswordHash)) {
      return json({ error: "Invalid email or password." }, 401);
    }
    const maxAge = body.remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
    const expiresAt = Date.now() + maxAge * 1000;
    const token = signToken(credentials, expiresAt);
    const isHttps = new URL(request.url).protocol === "https:";
    const secure = isHttps ? "; Secure" : "";
    return json(
      { admin: { name: "AutoUp Admin", email: credentials.email, role: "Super Admin" } },
      200,
      {
        "Set-Cookie": `autoup_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`,
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

  if (!pathname.startsWith("/api/admin/")) return json({ error: "Not found" }, 404);

  let credentials: AdminCredentials;
  try {
    credentials = getAdminCredentials();
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Admin authentication is not configured.",
      },
      503,
    );
  }
  if (!getSession(request, credentials)) return json({ error: "Unauthorized" }, 401);

  if (pathname === "/api/admin/session" && request.method === "GET") {
    return json({
      admin: { name: "AutoUp Admin", email: credentials.email, role: "Super Admin" },
    });
  }

  if (pathname === "/api/admin/password" && request.method === "POST") {
    return json(
      { error: "Set ADMIN_PASSWORD in your deployment environment to change the admin password." },
      409,
    );
  }

  const state = await readState();

  if (pathname === "/api/admin/media" && request.method === "POST") {
    const formData = await request.formData();
    const file = formData.get("file");
    const allowedTypes: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    };
    if (!file || typeof file === "string" || !allowedTypes[file.type]) {
      return json({ error: "Choose a JPEG, PNG, WebP, or AVIF image." }, 400);
    }
    if (file.size === 0 || file.size > 4 * 1024 * 1024) {
      return json({ error: "Images must be smaller than 4 MB." }, 400);
    }
    const key = `${randomBytes(16).toString("hex")}.${allowedTypes[file.type]}`;
    const client = supabase();
    const { data: uploaded, error: uploadError } = await client.storage
      .from("product-media")
      .upload(key, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) throw uploadError;
    const { data: publicUrl } = client.storage.from("product-media").getPublicUrl(uploaded.path);
    return json({ url: publicUrl.publicUrl });
  }

  if (pathname === "/api/admin/state" && request.method === "GET") {
    return json({
      products: state.products,
      categories: state.categories,
      inquiries: state.inquiries,
      activity: state.activity,
      settings: state.settings,
      admin: { name: state.admin.name, email: credentials.email, role: state.admin.role },
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
    const existingProduct = existing >= 0 ? state.products[existing] : undefined;
    const slug =
      existingProduct?.slug || product.slug?.trim() || product.id || slugify(product.name);
    if (state.products.some((item) => item.slug === slug && item.id !== product.id)) {
      return json({ error: "Product URL already exists." }, 409);
    }
    const saved = {
      ...product,
      id: product.id || randomBytes(8).toString("hex"),
      slug,
      catalogVariants: product.catalogVariants?.length
        ? product.catalogVariants
        : product.packageSize
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
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

  if (pathname === "/api/admin/account" && request.method === "POST") {
    const body = (await request.json()) as { name?: string; email?: string };
    const requestedEmail = (body.email || credentials.email).trim().toLowerCase();
    if (requestedEmail !== credentials.email) {
      return json({ error: "The admin email is managed by the ADMIN_EMAIL environment variable." }, 400);
    }
    state.admin.name = (body.name || state.admin.name).trim();
    state.admin.email = credentials.email;
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

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || randomBytes(8).toString("hex");
}
