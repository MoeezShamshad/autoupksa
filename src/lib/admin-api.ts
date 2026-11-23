import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { list, put } from "@vercel/blob";

import defaultContent from "@/data/website-content.json";
import { CATEGORIES, PRODUCTS } from "./catalog";
import { translateText } from "./i18n";
import {
  GitHubRepositoryError,
  isRepositoryConfigured,
  publishRepositoryFiles,
  readRepositoryJson,
  type RepositoryFile,
} from "./github-repository";
import type { WebsiteContent } from "./website-content";

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
  stock: number | null;
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

type AdminCredentials = {
  username: string;
  displayName: string;
  email: string;
  password?: string;
  passwordSalt?: string;
  passwordHash?: string;
  revision: string;
  sessionSecret: string;
};

type StoredAnalyticsEvent = {
  day: string;
  type: "add-to-cart" | "whatsapp-inquiry";
  session: string;
  products: string[];
};

const PRODUCTS_PATH = "src/data/products.json";
const CONTENT_PATH = "src/data/website-content.json";
const ADMIN_ACCOUNT_PATH = "src/data/admin-account.secure.json";

type StoredAdminAccount = {
  username: string;
  displayName: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  revision: string;
};

function getSessionSecret() {
  const sessionSecret = process.env["ADMIN_SESSION_SECRET"];
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  }
  return sessionSecret;
}

function accountEncryptionKey(sessionSecret: string) {
  return scryptSync(sessionSecret, "AutoUp admin account encryption v1", 32);
}

function encryptAdminAccount(account: StoredAdminAccount, sessionSecret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", accountEncryptionKey(sessionSecret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(account), "utf8"), cipher.final()]);
  return JSON.stringify({
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: encrypted.toString("base64"),
  });
}

function decryptAdminAccount(
  encrypted: { version: number; iv: string; tag: string; data: string },
  sessionSecret: string,
): StoredAdminAccount {
  if (encrypted.version !== 1) throw new Error("Unsupported admin account record version.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    accountEncryptionKey(sessionSecret),
    Buffer.from(encrypted.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"));
  const json = Buffer.concat([
    decipher.update(Buffer.from(encrypted.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
  const account = JSON.parse(json) as StoredAdminAccount;
  if (
    !account.username ||
    !account.displayName ||
    !account.email ||
    !account.passwordSalt ||
    !account.passwordHash ||
    !account.revision
  ) {
    throw new Error("Stored admin account is incomplete.");
  }
  return account;
}

async function getAdminCredentials(): Promise<AdminCredentials> {
  const email = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
  const password = process.env["ADMIN_PASSWORD"];
  const sessionSecret = getSessionSecret();
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured.");
  }
  const savedAccount = await readRepositoryJson<{
    version: number;
    iv: string;
    tag: string;
    data: string;
  }>(ADMIN_ACCOUNT_PATH);
  if (savedAccount) {
    const account = decryptAdminAccount(savedAccount, sessionSecret);
    return { ...account, sessionSecret };
  }
  return {
    username: email.split("@")[0] || email,
    displayName: "AutoUp Admin",
    email,
    password,
    revision: "environment",
    sessionSecret,
  };
}

function verifyPassword(password: string, credentials: AdminCredentials) {
  if (credentials.passwordSalt && credentials.passwordHash) {
    const supplied = scryptSync(password, Buffer.from(credentials.passwordSalt, "hex"), 64);
    const configured = Buffer.from(credentials.passwordHash, "hex");
    return supplied.length === configured.length && timingSafeEqual(supplied, configured);
  }
  const supplied = createHash("sha256").update(password).digest();
  const configured = createHash("sha256").update(credentials.password ?? "").digest();
  return timingSafeEqual(supplied, configured);
}

function credentialsRevision(credentials: AdminCredentials) {
  return createHmac("sha256", credentials.sessionSecret)
    .update(`${credentials.email}\0${credentials.revision}`)
    .digest("hex");
}

async function saveAdminAccount(
  credentials: AdminCredentials,
  changes: Partial<Pick<StoredAdminAccount, "username" | "displayName" | "email">>,
  newPassword?: string,
) {
  if (!isRepositoryConfigured()) {
    throw new Error(
      "Secure account publishing is unavailable. Configure GitHub repository access before changing admin credentials.",
    );
  }
  const passwordSalt = newPassword
    ? randomBytes(16).toString("hex")
    : credentials.passwordSalt || randomBytes(16).toString("hex");
  const account: StoredAdminAccount = {
    username: changes.username ?? credentials.username,
    displayName: changes.displayName ?? credentials.displayName,
    email: changes.email ?? credentials.email,
    passwordSalt,
    passwordHash: newPassword
      ? scryptSync(newPassword, Buffer.from(passwordSalt, "hex"), 64).toString("hex")
      : credentials.passwordHash ||
        scryptSync(credentials.password || "", Buffer.from(passwordSalt, "hex"), 64).toString("hex"),
    revision: randomBytes(16).toString("hex"),
  };
  await publishRepositoryFiles(
    [{
      path: ADMIN_ACCOUNT_PATH,
      content: encryptAdminAccount(account, credentials.sessionSecret),
    }],
    "Update encrypted admin account",
  );
  return account;
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
  if (extra !== undefined || !payload || !signature) return null;
  const expected = createHmac("sha256", credentials.sessionSecret).update(payload).digest();
  const supplied = Buffer.from(signature, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      expiresAt?: number;
      credentialVersion?: string;
    };
    const credentialVersion = credentialsRevision(credentials);
    if (
      claims.email !== credentials.email ||
      claims.credentialVersion !== credentialVersion ||
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
      credentialVersion: credentialsRevision(credentials),
    }),
    "utf8",
  ).toString("base64url");
  const signature = createHmac("sha256", credentials.sessionSecret).update(payload).digest("hex");
  return `${payload}.${signature}`;
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
      stock: null,
      status: "published",
      image: product.image,
      gallery: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
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

async function loadProducts(): Promise<AdminProduct[]> {
  const products = await readRepositoryJson<AdminProduct[]>(PRODUCTS_PATH);
  if (products) {
    if (!Array.isArray(products)) throw new Error("Repository product file must contain an array.");
    return products;
  }
  return catalogProducts();
}

async function loadContent(): Promise<WebsiteContent> {
  const content = await readRepositoryJson<WebsiteContent>(CONTENT_PATH);
  if (content) return content;
  return defaultContent as WebsiteContent;
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

function errorResponse(error: unknown) {
  if (error instanceof GitHubRepositoryError) {
    return json({ error: error.message }, error.status);
  }
  console.error("Admin API request failed:", error);
  return json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Admin service is unavailable. Check the server configuration.",
    },
    503,
  );
}

function hasReference(value: unknown, target: string): boolean {
  if (value === target) return true;
  if (Array.isArray(value)) return value.some((item) => hasReference(item, target));
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => hasReference(item, target));
  }
  return false;
}

async function deleteMediaFiles(paths: unknown[], products: AdminProduct[], content: WebsiteContent) {
  if (paths.length > 20) throw new Error("You can remove up to 20 images at a time.");
  const files: RepositoryFile[] = [];
  for (const path of [...new Set(paths)]) {
    if (
      typeof path !== "string" ||
      !/^public\/cms-media\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp|avif|gif|mp4)$/i.test(path)
    ) {
      throw new Error("Only images uploaded through the website CMS can be deleted.");
    }
    const publicPath = `/${path.replace(/^public\//, "")}`;
    if (products.some((product) => hasReference(product, publicPath)) || hasReference(content, publicPath)) {
      throw new GitHubRepositoryError(
        "Remove this image from all products and website sections before deleting its repository file.",
        409,
      );
    }
    files.push({ path, content: "", delete: true });
  }
  return files;
}

function parseAnalyticsPath(pathname: string) {
  const parts = pathname.split("/");
  if (parts.length !== 7 || parts[0] !== "analytics" || parts[1] !== "events") {
    throw new Error("Stored analytics event has an invalid path.");
  }
  const [, , eventId, day, type, session, productSegment] = parts;
  if (
    !eventId ||
    !/^[0-9a-f-]{36}$/i.test(eventId) ||
    !day ||
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    (type !== "add-to-cart" && type !== "whatsapp-inquiry") ||
    !session ||
    !/^[0-9a-f]{32}$/i.test(session) ||
    !productSegment ||
    (productSegment !== "none" &&
      !productSegment.split(",").every((productId) => /^[a-z0-9][a-z0-9-]{0,100}$/i.test(productId)))
  ) {
    throw new Error("Stored analytics event has invalid values.");
  }
  return {
    eventId,
    event: {
      day,
      type,
      session,
      products: productSegment === "none" ? [] : [...new Set(productSegment.split(","))],
    } as StoredAnalyticsEvent,
  };
}

async function analyticsSummary() {
  const events = new Map<string, StoredAnalyticsEvent>();
  let cursor: string | undefined;
  do {
    const page = await list({
      prefix: "analytics/events/",
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });
    for (const blob of page.blobs) {
      const { eventId, event } = parseAnalyticsPath(blob.pathname);
      if (!events.has(eventId)) events.set(eventId, event);
    }
    cursor = page.cursor ?? undefined;
  } while (cursor);

  const allEvents = [...events.values()];
  const addToCart = allEvents.filter((event) => event.type === "add-to-cart");
  const inquiries = allEvents.filter((event) => event.type === "whatsapp-inquiry");
  const productStats = new Map<string, { addToCart: number; whatsappInquiries: number }>();
  for (const event of allEvents) {
    for (const productId of event.products) {
      const stats = productStats.get(productId) ?? { addToCart: 0, whatsappInquiries: 0 };
      if (event.type === "add-to-cart") stats.addToCart += 1;
      else stats.whatsappInquiries += 1;
      productStats.set(productId, stats);
    }
  }

  const utcToday = new Date().toISOString().slice(0, 10);
  const daily = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(`${utcToday}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() - (13 - index));
    const day = date.toISOString().slice(0, 10);
    return { date: day, inquiries: inquiries.filter((event) => event.day === day).length };
  });
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(`${utcToday.slice(0, 7)}-01T00:00:00.000Z`);
    date.setUTCMonth(date.getUTCMonth() - (11 - index));
    const month = date.toISOString().slice(0, 7);
    return {
      month,
      inquiries: inquiries.filter((event) => event.day.startsWith(month)).length,
    };
  });

  return {
    totals: {
      addToCart: addToCart.length,
      whatsappClicks: inquiries.length,
      uniqueWhatsAppSessions: new Set(inquiries.map((event) => event.session)).size,
    },
    products: [...productStats.entries()].map(([productId, stats]) => ({ productId, ...stats })),
    daily,
    monthly,
  };
}

export async function handleAdminApi(request: Request, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith("/api/")) return null;
  try {
    return await handleAdminApiRequest(request, pathname);
  } catch (error) {
    return errorResponse(error);
  }
}

async function handleAdminApiRequest(request: Request, pathname: string): Promise<Response | null> {
  if (pathname === "/api/site-content" && request.method === "GET") {
    return json(await loadContent());
  }

  if (pathname === "/api/catalog" && request.method === "GET") {
    const products = await loadProducts();
    return json({
      products: products.filter((item) => item.status === "published"),
      categories: CATEGORIES.filter((item) => item !== "All Products"),
    });
  }

  if (pathname === "/api/analytics" && request.method === "POST") {
    let event: {
      eventId?: unknown;
      sessionId?: unknown;
      type?: unknown;
      productIds?: unknown;
    };
    try {
      event = (await request.json()) as typeof event;
    } catch {
      return json({ error: "Analytics event must be valid JSON." }, 400);
    }

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const validProducts =
      event.productIds === undefined ||
      (Array.isArray(event.productIds) &&
        event.productIds.length <= 20 &&
        event.productIds.every(
          (productId) =>
            typeof productId === "string" && /^[a-z0-9][a-z0-9-]{0,100}$/i.test(productId),
        ));
    if (
      typeof event.eventId !== "string" ||
      !uuidPattern.test(event.eventId) ||
      typeof event.sessionId !== "string" ||
      !uuidPattern.test(event.sessionId) ||
      (event.type !== "add_to_cart" && event.type !== "whatsapp_inquiry") ||
      !validProducts
    ) {
      return json({ error: "Analytics event is invalid." }, 400);
    }

    const productIds = [...new Set((event.productIds as string[] | undefined) ?? [])].sort();
    const day = new Date().toISOString().slice(0, 10);
    const eventType = event.type === "add_to_cart" ? "add-to-cart" : "whatsapp-inquiry";
    const sessionHash = createHash("sha256").update(event.sessionId).digest("hex").slice(0, 32);
    const productSegment = productIds.length ? productIds.join(",") : "none";
    const path = `analytics/events/${event.eventId}/${day}/${eventType}/${sessionHash}/${productSegment}`;
    await put(path, "1", {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return json({ success: true }, 202);
  }

  if (pathname === "/api/admin/login" && request.method === "POST") {
    let credentials: AdminCredentials;
    try {
      credentials = await getAdminCredentials();
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Admin authentication is not configured." },
        503,
      );
    }
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      remember?: boolean;
    };
    const email = (body.email || "").trim().toLowerCase();
    if (email !== credentials.email || !verifyPassword(body.password || "", credentials)) {
      return json({ error: "Invalid email or password." }, 401);
    }
    const maxAge = body.remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
    const expiresAt = Date.now() + maxAge * 1000;
    const token = signToken(credentials, expiresAt);
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return json(
      {
        admin: {
          name: credentials.displayName,
          username: credentials.username,
          email: credentials.email,
          role: "Super Admin",
        },
      },
      200,
      {
        "Set-Cookie": `autoup_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`,
      },
    );
  }

  if (pathname === "/api/admin/logout" && request.method === "POST") {
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return json({ success: true }, 200, {
      "Set-Cookie": `autoup_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`,
    });
  }

  if (!pathname.startsWith("/api/admin/") && pathname !== "/api/analytics") {
    return json({ error: "Not found" }, 404);
  }

  let credentials: AdminCredentials;
  try {
    credentials = await getAdminCredentials();
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Admin authentication is not configured." },
      503,
    );
  }
  const sessionClaims = getSession(request, credentials);
  if (!sessionClaims) return json({ error: "Unauthorized" }, 401);

  if (pathname === "/api/admin/session" && request.method === "GET") {
    return json({
      admin: {
        name: credentials.displayName,
        username: credentials.username,
        email: credentials.email,
        role: "Super Admin",
      },
    });
  }

  if (pathname === "/api/admin/account/profile" && request.method === "POST") {
    const body = (await request.json()) as {
      currentPassword?: string;
      displayName?: string;
      username?: string;
      email?: string;
    };
    if (!verifyPassword(body.currentPassword || "", credentials)) {
      return json({ error: "Old password is incorrect." }, 401);
    }
    const displayName = body.displayName?.trim();
    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    if (!displayName || displayName.length > 80) {
      return json({ error: "Display name must be between 1 and 80 characters." }, 400);
    }
    if (!username || !/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
      return json({ error: "Username must be 3–32 characters using letters, numbers, dots, underscores or hyphens." }, 400);
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json({ error: "Enter a valid email address." }, 400);
    }
    const saved = await saveAdminAccount(credentials, { displayName, username, email });
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return json(
      { success: true, admin: { name: saved.displayName, username: saved.username, email: saved.email, role: "Super Admin" } },
      200,
      { "Set-Cookie": `autoup_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}` },
    );
  }

  if (pathname === "/api/admin/account/username" && request.method === "POST") {
    const body = (await request.json()) as {
      currentPassword?: string;
      newUsername?: string;
      confirmUsername?: string;
    };
    if (!verifyPassword(body.currentPassword || "", credentials)) {
      return json({ error: "Old password is incorrect." }, 401);
    }
    const newUsername = body.newUsername?.trim();
    if (!newUsername || !/^[a-zA-Z0-9._-]{3,32}$/.test(newUsername)) {
      return json({ error: "Username must be 3–32 characters using letters, numbers, dots, underscores or hyphens." }, 400);
    }
    if (newUsername !== body.confirmUsername?.trim()) {
      return json({ error: "Username confirmation does not match." }, 400);
    }
    const saved = await saveAdminAccount(credentials, { username: newUsername });
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return json(
      { success: true, admin: { name: saved.displayName, username: saved.username, email: saved.email, role: "Super Admin" } },
      200,
      { "Set-Cookie": `autoup_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}` },
    );
  }

  if (pathname === "/api/admin/account/email" && request.method === "POST") {
    const body = (await request.json()) as {
      currentPassword?: string;
      newEmail?: string;
      confirmEmail?: string;
    };
    if (!verifyPassword(body.currentPassword || "", credentials)) {
      return json({ error: "Old password is incorrect." }, 401);
    }
    const newEmail = body.newEmail?.trim().toLowerCase();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) || newEmail.length > 254) {
      return json({ error: "Enter a valid email address." }, 400);
    }
    if (newEmail !== body.confirmEmail?.trim().toLowerCase()) {
      return json({ error: "Email confirmation does not match." }, 400);
    }
    const saved = await saveAdminAccount(credentials, { email: newEmail });
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return json(
      {
        success: true,
        verification: "Email verification is not configured; the new email is active immediately.",
        admin: { name: saved.displayName, username: saved.username, email: saved.email, role: "Super Admin" },
      },
      200,
      { "Set-Cookie": `autoup_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}` },
    );
  }

  if (pathname === "/api/admin/account/password" && request.method === "POST") {
    const body = (await request.json()) as {
      oldPassword?: string;
      newPassword?: string;
      confirmNewPassword?: string;
    };
    if (!verifyPassword(body.oldPassword || "", credentials)) {
      return json({ error: "Old password is incorrect." }, 401);
    }
    const newPassword = body.newPassword || "";
    if (newPassword !== body.confirmNewPassword) {
      return json({ error: "New password confirmation does not match." }, 400);
    }
    if (
      newPassword.length < 12 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      !/[^a-zA-Z0-9]/.test(newPassword)
    ) {
      return json({
        error: "Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol.",
      }, 400);
    }
    await saveAdminAccount(credentials, {}, newPassword);
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return json(
      { success: true, message: "Password updated. Sign in again with your new password." },
      200,
      { "Set-Cookie": `autoup_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}` },
    );
  }

  if (pathname === "/api/admin/account/security/sessions" && request.method === "POST") {
    const body = (await request.json()) as { currentPassword?: string };
    if (!verifyPassword(body.currentPassword || "", credentials)) {
      return json({ error: "Current password is incorrect." }, 401);
    }
    const saved = await saveAdminAccount(credentials, {});
    const renewedCredentials = { ...credentials, ...saved };
    const expiresAt = sessionClaims.expiresAt;
    const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    const token = signToken(renewedCredentials, expiresAt);
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return json(
      { success: true, message: "All other admin sessions have been signed out." },
      200,
      { "Set-Cookie": `autoup_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}` },
    );
  }

  if (pathname === "/api/admin/account" && request.method === "POST") {
    let body: {
      currentPassword?: string;
      displayName?: string;
      username?: string;
      email?: string;
      newPassword?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: "Account update must be valid JSON." }, 400);
    }
    if (!verifyPassword(body.currentPassword || "", credentials)) {
      return json({ error: "Current password is incorrect." }, 401);
    }
    const displayName = body.displayName?.trim();
    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const newPassword = body.newPassword;
    if (!displayName || displayName.length > 80) {
      return json({ error: "Display name must be between 1 and 80 characters." }, 400);
    }
    if (!username || !/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
      return json({ error: "Username must be 3–32 characters using letters, numbers, dots, underscores or hyphens." }, 400);
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json({ error: "Enter a valid email address." }, 400);
    }
    if (
      newPassword !== undefined &&
      (newPassword.length < 12 ||
        !/[a-z]/.test(newPassword) ||
        !/[A-Z]/.test(newPassword) ||
        !/\d/.test(newPassword) ||
        !/[^a-zA-Z0-9]/.test(newPassword))
    ) {
      return json({
        error: "Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol.",
      }, 400);
    }
    const saved = await saveAdminAccount(credentials, { displayName, username, email }, newPassword);
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return json(
      { success: true, admin: { name: saved.displayName, username: saved.username, email: saved.email, role: "Super Admin" } },
      200,
      { "Set-Cookie": `autoup_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}` },
    );
  }

  if (pathname === "/api/analytics" && request.method === "GET") {
    return json(await analyticsSummary());
  }

  if (pathname === "/api/admin/state" && request.method === "GET") {
    const [products, content] = await Promise.all([loadProducts(), loadContent()]);
    return json({
      products,
      categories: CATEGORIES.filter((item) => item !== "All Products"),
      content,
      activity: [],
      admin: {
        name: credentials.displayName,
        username: credentials.username,
        email: credentials.email,
        role: "Super Admin",
      },
    });
  }

  if (pathname === "/api/admin/products" && request.method === "POST") {
    const product = (await request.json()) as AdminProduct;
    if (!product.name?.trim() || !product.sku?.trim()) {
      return json({ error: "Name and SKU are required." }, 400);
    }
    const products = await loadProducts();
    if (
      products.some(
        (item) =>
          item.sku.toLowerCase() === product.sku.trim().toLowerCase() && item.id !== product.id,
      )
    ) {
      return json({ error: "SKU already exists." }, 409);
    }

    const now = new Date().toISOString();
    const existingIndex = products.findIndex((item) => item.id === product.id);
    const existing = existingIndex >= 0 ? products[existingIndex] : undefined;
    const slug = existing?.slug || product.slug?.trim() || product.id || slugify(product.name);
    if (products.some((item) => item.slug === slug && item.id !== product.id)) {
      return json({ error: "Product URL already exists." }, 409);
    }
    const saved: AdminProduct = {
      ...product,
      id: product.id || randomBytes(8).toString("hex"),
      slug,
      catalogVariants:
        product.catalogVariants?.length
          ? product.catalogVariants
          : product.packageSize
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    const next = [...products];
    if (existingIndex >= 0) next[existingIndex] = saved;
    else next.unshift(saved);
    await publishRepositoryFiles(
      [{ path: PRODUCTS_PATH, content: JSON.stringify(next, null, 2) }],
      `${existing ? "Update" : "Add"} product: ${saved.name}`,
    );
    return json(saved);
  }

  if (pathname === "/api/admin/products" && request.method === "DELETE") {
    const body = (await request.json()) as { id?: string };
    if (!body.id) return json({ error: "A product ID is required." }, 400);
    const products = await loadProducts();
    if (!products.some((item) => item.id === body.id)) {
      return json({ error: "Product not found." }, 404);
    }
    await publishRepositoryFiles(
      [
        {
          path: PRODUCTS_PATH,
          content: JSON.stringify(products.filter((item) => item.id !== body.id), null, 2),
        },
      ],
      "Delete product",
    );
    return json({ success: true });
  }

  if (pathname === "/api/admin/content" && request.method === "POST") {
    const body = (await request.json()) as {
      content?: WebsiteContent;
      deleteMedia?: unknown[];
    };
    if (!body.content || typeof body.content !== "object" || body.content.version !== 1) {
      return json({ error: "Website content is invalid." }, 400);
    }
    const [products, currentContent] = await Promise.all([loadProducts(), loadContent()]);
    const newContent = { ...currentContent, ...body.content } as WebsiteContent;
    const deleteFiles = await deleteMediaFiles(body.deleteMedia ?? [], products, newContent);
    const files: RepositoryFile[] = [
      { path: CONTENT_PATH, content: JSON.stringify(newContent, null, 2) },
      ...deleteFiles,
    ];
    await publishRepositoryFiles(files, "Publish website content");
    return json({ success: true, content: newContent });
  }

  if (pathname === "/api/admin/media" && request.method === "POST") {
    const formData = await request.formData();
    const files = [...formData.getAll("files"), ...formData.getAll("file")].filter(
      (value): value is File => value instanceof File,
    );
    if (!files.length || files.length > 10) {
      return json({ error: "Choose between 1 and 10 image or video files." }, 400);
    }
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
      "image/gif": "gif",
      "video/mp4": "mp4",
    };
    if (files.some((file) => !extensions[file.type] || file.size === 0 || file.size > 10 * 1024 * 1024)) {
      return json({ error: "Use JPEG, PNG, WebP, AVIF, GIF, or MP4 files up to 10 MB each." }, 400);
    }
    if (files.reduce((total, file) => total + file.size, 0) > 40 * 1024 * 1024) {
      return json({ error: "The total upload size must be less than 40 MB." }, 400);
    }
    const uploaded = files.map((file) => {
      const path = `public/cms-media/${randomBytes(12).toString("hex")}.${extensions[file.type]}`;
      return { file, path };
    });
    const repositoryFiles = await Promise.all(
      uploaded.map(async ({ file, path }) => ({
        path,
        content: Buffer.from(await file.arrayBuffer()).toString("base64"),
        encoding: "base64" as const,
      })),
    );
    await publishRepositoryFiles(repositoryFiles, "Upload website media");
    const images = uploaded.map(({ file, path }) => ({
      name: file.name,
      path,
      url: `/${path.replace(/^public\//, "")}`,
    }));
    return json({ images, ...(images[0] ? { url: images[0].url } : {}) });
  }

  if (pathname === "/api/admin/media" && request.method === "DELETE") {
    const body = (await request.json()) as { path?: string };
    const [products, content] = await Promise.all([loadProducts(), loadContent()]);
    const files = await deleteMediaFiles([body.path], products, content);
    await publishRepositoryFiles(files, "Delete website media");
    return json({ success: true });
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
