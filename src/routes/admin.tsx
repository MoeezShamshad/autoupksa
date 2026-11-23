import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Box,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  LogOut,
  MessageCircle,
  Menu,
  Package2,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Trash2,
  Users,
  Wand2,
  LayoutDashboard,
  Images,
  Globe2,
  Settings,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import adminLogo from "@/assets/autoup-final-logo.webp";
import type { WebsiteContent } from "@/lib/website-content";
import { mediaUrl } from "@/lib/media";

const ADMIN_MENU = [
  "Dashboard",
  "Products",
  "Gallery",
  "Website Content",
  "Analytics",
  "Settings",
] as const;

type AdminSection = (typeof ADMIN_MENU)[number];
const SIDEBAR_MENU = [
  "Dashboard",
  "Products",
  "Gallery",
  "Website Content",
  "Analytics",
  "Settings",
] as const;

type AnalyticsPayload = {
  totals: {
    addToCart: number;
    whatsappClicks: number;
    uniqueWhatsAppSessions: number;
  };
  products: Array<{
    productId: string;
    addToCart: number;
    whatsappInquiries: number;
  }>;
  daily: Array<{ date: string; inquiries: number }>;
  monthly: Array<{ month: string; inquiries: number }>;
};

type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  sku: string;
  category: string;
  packageSize: string;
  catalogVariants: string[];
  packageType: "retail" | "gallon" | "other-commercial";
  code: string;
  short: string;
  usage: string;
  featured: number;
  price: number;
  salePrice?: number;
  stock: number | null;
  status: "draft" | "published";
  image: string;
  images?: string[];
  images?: string[];
  updatedAt: string;
  brand: string;
  description: string;
  descriptionAr: string;
};

type AdminCategory = {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  image: string;
  order: number;
  active: boolean;
};

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  read: boolean;
  time: string;
};

type ProfileState = {
  name: string;
  username?: string;
  email: string;
  role: string;
};

const toCurrency = (amount: number) => `SAR ${amount.toFixed(2)}`;

function readAdminProfile(): ProfileState {
  return { name: "Admin User", email: "", role: "Super Admin" };
}

function createEmptyProduct(): AdminProduct {
  return {
    id: crypto.randomUUID(),
    slug: "",
    name: "",
    nameAr: "",
    sku: "AUTO-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
    category: "Car Shampoo",
    packageSize: "20 L",
    catalogVariants: ["20 L"],
    packageType: "other-commercial",
    code: "",
    short: "",
    usage: "",
    featured: 0,
    price: 0,
    stock: null,
    status: "draft",
    image: "",
    images: [],
    updatedAt: new Date().toISOString(),
    brand: "AutoUp",
    description: "",
    descriptionAr: "",
  };
}

export function AdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((response) => {
        if (response.ok) window.location.assign("/admin");
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
        credentials: "same-origin",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Invalid email or password.");
        setIsSubmitting(false);
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("Unable to reach the authentication service.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      dir="ltr"
      className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-left text-slate-100"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-primary/80">AutoUp</p>
            <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="admin-email" className="text-sm font-medium text-slate-200">
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="Admin email"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-password" className="text-sm font-medium text-slate-200">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 pr-10 text-sm text-white outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-3 flex items-center text-slate-300 transition hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-slate-300">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                className="h-4 w-4 rounded border-white/10 bg-slate-900 text-primary"
              />
              Remember me
            </label>
            <button type="button" className="text-primary transition hover:text-primary/80">
              Forgot password?
            </button>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminApp({ initialAdmin }: { initialAdmin: ProfileState }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [section, setSection] = useState<AdminSection>("Dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [websiteContent, setWebsiteContent] = useState<WebsiteContent | null>(null);
  const [contentEditor, setContentEditor] = useState("");
  const [contentView, setContentView] = useState<"settings" | "seo" | "home" | "pages" | "gallery">("home");
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [profile, setProfile] = useState<ProfileState>(() => initialAdmin);
  const [dataError, setDataError] = useState("");
  const [search, setSearch] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRefresh, setAnalyticsRefresh] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<AdminProduct>(() => createEmptyProduct());
  const [productError, setProductError] = useState("");
  const [imageUploadError, setImageUploadError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState<AdminCategory>({
    id: crypto.randomUUID(),
    name: "",
    nameAr: "",
    description: "",
    image: "",
    order: 1,
    active: true,
  });

  useEffect(() => {
    fetch("/api/admin/state", { credentials: "same-origin" })
      .then((response) => {
        if (response.status === 401) {
          window.location.assign("/admin/login");
          return null;
        }
        if (!response.ok) {
          setDataError(
            "Admin data storage is unavailable. Product and media tools need a database connection.",
          );
          return null;
        }
        setDataError("");
        return response.json();
      })
      .then((payload) => {
        if (!payload) return;
        if (Array.isArray(payload.products)) setProducts(payload.products);
        if (Array.isArray(payload.categories)) setCategories(payload.categories);
        if (payload.content && typeof payload.content === "object") {
          const content = payload.content as WebsiteContent;
          setWebsiteContent(content);
          setContentEditor(JSON.stringify(content.home ?? {}, null, 2));
        }
        if (Array.isArray(payload.activity)) {
          setNotifications(
            payload.activity
              .slice(0, 8)
              .map((item: { id: string; action: string; detail: string; createdAt: string }) => ({
                id: item.id,
                title: item.action,
                detail: item.detail,
                read: false,
                time: new Date(item.createdAt).toLocaleString(),
              })),
          );
        }
        if (payload.admin) {
          setProfile(payload.admin);
        }
      })
      .catch((error) => {
        console.error("Unable to load admin panel data.", error);
        setDataError(
          "Admin data storage is unavailable. Product and media tools need a database connection.",
        );
      });
  }, []);

  useEffect(() => {
    if (section !== "Analytics" && section !== "Dashboard") return;
    let active = true;
    setAnalyticsLoading(true);
    setAnalyticsError("");
    fetch("/api/analytics", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as AnalyticsPayload | { error?: string };
        if (!response.ok) {
          throw new Error(
            "error" in payload
              ? payload.error || "Unable to load analytics."
              : "Unable to load analytics.",
          );
        }
        if (active) setAnalytics(payload as AnalyticsPayload);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("Unable to load AutoUp analytics.", error);
        setAnalyticsError(error instanceof Error ? error.message : "Unable to load analytics.");
      })
      .finally(() => {
        if (active) setAnalyticsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [section, analyticsRefresh]);

  useEffect(() => {
    if (!websiteContent) return;
    const sectionData =
      contentView === "settings" ? websiteContent.settings :
      contentView === "seo" ? websiteContent.seo :
      contentView === "home" ? websiteContent.home :
      contentView === "pages" ? websiteContent.pages :
      websiteContent.gallery;
    setContentEditor(JSON.stringify(sectionData, null, 2));
  }, [contentView, websiteContent]);

  const filteredProducts = useMemo(() => {
    const text = search.toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !text ||
        product.name.toLowerCase().includes(text) ||
        product.sku.toLowerCase().includes(text);
      return matchesSearch;
    });
  }, [products, search]);

  const stats = useMemo(() => {
    const published = products.filter((product) => product.status === "published").length;
    const draft = products.filter((product) => product.status === "draft").length;
    const inStock = products.filter((product) => typeof product.stock === "number" && product.stock > 0).length;
    const outOfStock = products.filter((product) => typeof product.stock === "number" && product.stock <= 0).length;
    const galleryImages =
      websiteContent?.gallery?.items?.filter((item) => item.active !== false).length ?? 0;
    return {
      totalProducts: products.length,
      published,
      draft,
      inStock,
      outOfStock,
      categories: categories.length,
      galleryImages,
      addToCartEvents: analytics?.totals.addToCart ?? 0,
      whatsappClicks: analytics?.totals.whatsappClicks ?? 0,
    };
  }, [products, categories, websiteContent, analytics]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  function handleLogout() {
    fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }).finally(() =>
      window.location.assign("/admin"),
    );
  }

  function openProductModal(product?: AdminProduct) {
    setProductError("");
    setImageUploadError("");
    if (product) {
      setEditingProductId(product.id);
      setProductDraft({ ...product });
    } else {
      setEditingProductId(null);
      setProductDraft(createEmptyProduct());
    }
    setShowProductModal(true);
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    if (!productDraft.name.trim() || !productDraft.sku.trim()) return;
    const payload = editingProductId
      ? { ...productDraft, id: editingProductId }
      : { ...productDraft, id: "" };
    payload.catalogVariants = productDraft.packageSize
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    try {
      const saved = await persistProduct(payload);
      setProducts((current) => {
        const existing = current.findIndex((product) => product.id === saved.id);
        if (existing >= 0)
          return current.map((product) => (product.id === saved.id ? saved : product));
        return [saved, ...current];
      });
      setShowProductModal(false);
      setSection("Products");
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "Unable to save product.");
    }
  }

  async function persistProduct(product: AdminProduct): Promise<AdminProduct> {
    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(product),
    });
    const payload = (await response.json()) as AdminProduct | { error?: string };
    if (!response.ok) {
      throw new Error(
        "error" in payload ? payload.error || "Unable to save product." : "Unable to save product.",
      );
    }
    return payload as AdminProduct;
  }

  async function duplicateProduct(product: AdminProduct) {
    const duplicate = {
      ...product,
      id: "",
      slug: "",
      sku: `${product.sku}-COPY`,
      name: `${product.name} Copy`,
      updatedAt: new Date().toISOString(),
    };
    try {
      const saved = await persistProduct(duplicate);
      setProducts((current) => [saved, ...current]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to duplicate product.");
    }
  }

  function deleteProduct(id: string) {
    const product = products.find((item) => item.id === id);
    if (!window.confirm(`Delete "${product?.name || "this product"}"? This cannot be undone.`)) {
      return;
    }
    fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id }),
    })
      .then((response) => {
        if (response.ok) {
          setProducts((current) => current.filter((product) => product.id !== id));
        } else {
          toast.error("Unable to delete product.");
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Unable to delete product.");
      });
  }

  async function togglePublish(productId: string, nextStatus: "published" | "draft") {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    try {
      const saved = await persistProduct({
        ...product,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
      setProducts((current) => current.map((item) => (item.id === saved.id ? saved : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update product status.");
    }
  }

  function saveCategory(event: FormEvent) {
    event.preventDefault();
    if (!categoryDraft.name.trim()) return;
    fetch("/api/admin/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(categoryDraft),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((saved) => {
        if (!saved) return;
        setCategories((current) => {
          const existing = current.findIndex((item) => item.id === saved.id);
          return existing >= 0
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [...current, saved];
        });
        setShowCategoryModal(false);
        setCategoryDraft({
          id: crypto.randomUUID(),
          name: "",
          nameAr: "",
          description: "",
          image: "",
          order: 1,
          active: true,
        });
      });
  }

  function deleteCategory(id: string) {
    setCategories((current) => current.filter((item) => item.id !== id));
  }

  async function handleImageUpload(file: File | null, callback: (value: string) => void) {
    if (!file) return;
    setImageUploadError("");
    if (file.size === 0 || file.size > 4 * 1024 * 1024) {
      setImageUploadError("Choose an image smaller than 4 MB.");
      return;
    }
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/media", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to upload image.");
      }
      callback(payload.url);
    } catch (error) {
      setImageUploadError(error instanceof Error ? error.message : "Unable to upload image.");
      toast.error(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function publishWebsiteContent(nextContent: WebsiteContent) {
    try {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ content: nextContent }),
      });
      const payload = (await response.json()) as { content?: WebsiteContent; error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to publish website content.");
      setWebsiteContent(payload.content || nextContent);
      toast.success("Website content published.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to publish website content.");
      return false;
    }
  }

  function renderDashboard() {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total products", value: stats.totalProducts },
            { label: "Published", value: stats.published },
            { label: "Draft products", value: stats.draft },
            { label: "In-stock products", value: stats.inStock },
            { label: "Out of stock", value: stats.outOfStock },
            { label: "Gallery images", value: stats.galleryImages },
            { label: "Add-to-cart events", value: stats.addToCartEvents },
            { label: "WhatsApp inquiry clicks", value: stats.whatsappClicks },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Products", detail: "Manage catalog, stock, pricing and product images", action: "Manage Products", target: "Products" as AdminSection },
            { title: "Gallery", detail: "Upload, edit and reorder public gallery images", action: "Manage Gallery", target: "Gallery" as AdminSection },
            { title: "Website Content", detail: "Edit homepage, pages, banners and SEO", action: "Edit Content", target: "Website Content" as AdminSection },
          ].map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => setSection(item.target)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <h2 className="font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.detail}</p>
              <span className="mt-4 inline-block text-sm font-medium text-slate-700">{item.action}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderProducts() {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products or SKU"
              className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400"
                          aria-label={`No image for ${product.name}`}
                        >
                          <Package2 className="h-5 w-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                    <td className="px-4 py-3 text-slate-600">{product.sku}</td>
                    <td className="px-4 py-3 text-slate-600">{product.category}</td>
                    <td className="px-4 py-3 text-slate-600">{toCurrency(product.price)}</td>
                    <td className="px-4 py-3 text-slate-600">{product.stock ?? "Not set"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${product.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(product.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openProductModal(product)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            togglePublish(
                              product.id,
                              product.status === "published" ? "draft" : "published",
                            )
                          }
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          {product.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(product.id)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderAnalytics() {
    const formatCount = (value: number) => new Intl.NumberFormat().format(value);
    const trend = (
      label: string,
      values: Array<{ label: string; value: number }>,
      columns: string,
    ) => {
      const max = Math.max(1, ...values.map((item) => item.value));
      return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900">{label}</h2>
            <p className="mt-1 text-xs text-slate-500">WhatsApp inquiry button clicks</p>
          </div>
          <div className={`grid ${columns} items-end gap-2`}>
            {values.map((item) => (
              <div key={item.label} className="flex min-w-0 flex-col items-center gap-2">
                <span className="text-[10px] tabular-nums text-slate-500">{item.value || ""}</span>
                <div className="flex h-28 w-full items-end rounded-md bg-slate-50 p-1">
                  <div
                    className="w-full rounded-sm bg-[#3F3F46] transition-[height] duration-500"
                    style={{ height: `${item.value ? Math.max(8, (item.value / max) * 100) : 0}%` }}
                    title={`${item.label}: ${item.value}`}
                  />
                </div>
                <span className="truncate text-[10px] text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      );
    };

    const daily = (analytics?.daily ?? []).map((item) => ({
      label: new Date(`${item.date}T00:00:00.000Z`).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      value: item.inquiries,
    }));
    const monthly = (analytics?.monthly ?? []).map((item) => ({
      label: new Date(`${item.month}-01T00:00:00.000Z`).toLocaleDateString(undefined, {
        month: "short",
        timeZone: "UTC",
      }),
      value: item.inquiries,
    }));
    const productNames = new Map(
      products.flatMap((product) => [
        [product.id, product.name] as const,
        [product.slug, product.name] as const,
      ]),
    );
    const productStats = [...(analytics?.products ?? [])].sort(
      (a, b) => b.addToCart + b.whatsappInquiries - (a.addToCart + a.whatsappInquiries),
    );

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Store activity</h2>
            <p className="mt-1 text-sm text-slate-500">
              Real add-to-cart events and WhatsApp inquiry clicks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAnalyticsRefresh((current) => current + 1)}
            disabled={analyticsLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${analyticsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {analyticsError ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {analyticsError}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            {
              label: "Add to cart",
              value: analytics?.totals.addToCart ?? 0,
              icon: <ShoppingCart className="h-4 w-4" />,
            },
            {
              label: "WhatsApp inquiry clicks",
              value: analytics?.totals.whatsappClicks ?? 0,
              icon: <MessageCircle className="h-4 w-4" />,
            },
            {
              label: "Unique inquiry sessions",
              value: analytics?.totals.uniqueWhatsAppSessions ?? 0,
              icon: <BarChart3 className="h-4 w-4" />,
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between text-sm text-slate-500">
                {metric.label}
                <span className="rounded-lg bg-black/[0.05] p-2 text-slate-700">{metric.icon}</span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                {analytics ? formatCount(metric.value) : "—"}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          Inquiry counts record a click on WhatsApp. AutoUp cannot verify whether a message was sent
          or delivered. Unique sessions are estimated per browser tab session.
        </p>

        {analyticsLoading && !analytics ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading activity…
          </div>
        ) : !analytics ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Analytics data is unavailable until the event store reconnects.
          </div>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              {trend("Daily inquiries · 14 days", daily, "grid-cols-7")}
              {trend("Monthly inquiries · 12 months", monthly, "grid-cols-6")}
            </div>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">Product activity</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Counts include only actions associated with each product.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Product</th>
                      <th className="px-5 py-3">Add to cart</th>
                      <th className="px-5 py-3">WhatsApp inquiries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productStats.map((item) => (
                      <tr key={item.productId} className="border-t border-slate-100">
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {productNames.get(item.productId) ?? item.productId}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-slate-600">
                          {formatCount(item.addToCart)}
                        </td>
                        <td className="px-5 py-3 tabular-nums text-slate-600">
                          {formatCount(item.whatsappInquiries)}
                        </td>
                      </tr>
                    ))}
                    {!productStats.length ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-500">
                          No product activity recorded yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    );
  }

  function renderCategories() {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add Category
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div
                className="mb-3 h-24 rounded-xl bg-slate-100"
                style={{
                  backgroundImage: category.image ? `url(${category.image})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{category.name}</p>
                  <p className="text-xs text-slate-500">{category.nameAr}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold ${category.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
                >
                  {category.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{category.description}</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryDraft(category);
                    setShowCategoryModal(true);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteCategory(category.id)}
                  className="flex-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderInventory() {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Package</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                  <td className="px-4 py-3 text-slate-600">{product.packageSize}</td>
                  <td className="px-4 py-3 text-slate-600">{product.stock ?? "Not set"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${product.stock == null ? "bg-slate-100 text-slate-600" : product.stock <= 0 ? "bg-red-100 text-red-700" : product.stock <= 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {product.stock == null
                        ? "Stock not set"
                        : product.stock <= 0
                          ? "Out of stock"
                          : product.stock <= 5
                            ? "Low stock"
                            : "Available"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const saved = await persistProduct({
                            ...product,
                            stock: Math.max(0, (product.stock ?? 0) + 1),
                          });
                          setProducts((current) =>
                            current.map((item) => (item.id === saved.id ? saved : item)),
                          );
                        } catch (error) {
                          toast.error(
                            error instanceof Error ? error.message : "Unable to update stock.",
                          );
                        }
                      }}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
                    >
                      +1 stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderGalleryManager() {
    if (!websiteContent) {
      return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading gallery content…</div>;
    }
    const gallery = websiteContent.gallery;
    const items = gallery.items as Array<{
      id: string;
      title: string;
      subtitle?: string;
      description?: string;
      category: string;
      image: string;
      aspect?: "tall" | "wide" | "square";
      placements?: string[];
      active?: boolean;
    }>;

    const updateGallery = (nextItems: typeof items) =>
      setWebsiteContent({ ...websiteContent, gallery: { ...gallery, items: nextItems } });

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{gallery.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{items.length} gallery assets · Drag cards to reorder</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#111111] px-3.5 py-2.5 text-sm font-medium text-white hover:bg-[#262626]">
            <Plus className="h-4 w-4" />
            Upload images
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (event) => {
                const files = [...(event.target.files ?? [])];
                if (!files.length) return;
                setIsUploadingImage(true);
                try {
                  const formData = new FormData();
                  files.forEach((file) => formData.append("files", file));
                  const response = await fetch("/api/admin/media", {
                    method: "POST",
                    credentials: "same-origin",
                    body: formData,
                  });
                  const payload = (await response.json()) as { images?: Array<{ url: string; name: string }>; error?: string };
                  if (!response.ok || !payload.images) throw new Error(payload.error || "Unable to upload images.");
                  const newItems = payload.images.map((image, index) => ({
                    id: crypto.randomUUID(),
                    title: image.name.replace(/\.[^.]+$/, ""),
                    subtitle: "",
                    description: "",
                    category: gallery.categories[0] || "Vehicles",
                    image: image.url,
                    aspect: "square" as const,
                    placements: ["gallery"],
                    active: true,
                  }));
                  updateGallery([...items, ...newItems]);
                  toast.success(`${newItems.length} image${newItems.length === 1 ? "" : "s"} uploaded.`);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to upload images.");
                } finally {
                  setIsUploadingImage(false);
                  event.target.value = "";
                }
              }}
            />
          </label>
        </div>

        {selectedGalleryIds.length ? (
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-sm text-slate-600">{selectedGalleryIds.length} selected</span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete ${selectedGalleryIds.length} selected gallery images?`)) {
                  updateGallery(items.filter((item) => !selectedGalleryIds.includes(item.id)));
                  setSelectedGalleryIds([]);
                }
              }}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Delete Selected
            </button>
          </div>
        ) : null}

        {isUploadingImage ? <p className="text-sm text-slate-500">Uploading and preparing previews…</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <article
              key={item.id}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData("text/plain"));
                if (!Number.isInteger(from) || from === index) return;
                const reordered = [...items];
                const [moved] = reordered.splice(from, 1);
                reordered.splice(index, 0, moved);
                updateGallery(reordered);
              }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                <img src={mediaUrl(item.image)} alt={item.title} className="h-full w-full object-cover" />
                <input
                  type="checkbox"
                  checked={selectedGalleryIds.includes(item.id)}
                  onChange={(event) =>
                    setSelectedGalleryIds((current) =>
                      event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                    )
                  }
                  aria-label={`Select ${item.title}`}
                  className="absolute left-2 top-2 h-4 w-4"
                />
                <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-600 shadow">{index + 1}</span>
              </div>
              <div className="space-y-3 p-4">
                <input
                  value={item.title}
                  onChange={(event) => updateGallery(items.map((current) => current.id === item.id ? { ...current, title: event.target.value } : current))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Title"
                />
                <textarea
                  value={item.description || item.subtitle || ""}
                  onChange={(event) => updateGallery(items.map((current) => current.id === item.id ? { ...current, subtitle: event.target.value, description: event.target.value } : current))}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Caption"
                />
                <select
                  value={item.category}
                  onChange={(event) => updateGallery(items.map((current) => current.id === item.id ? { ...current, category: event.target.value } : current))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {gallery.categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={item.active !== false}
                      onChange={(event) => updateGallery(items.map((current) => current.id === item.id ? { ...current, active: event.target.checked } : current))}
                    />
                    Active
                  </label>
                  <label className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
                    Replace
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append("file", file);
                        try {
                          const response = await fetch("/api/admin/media", {
                            method: "POST",
                            credentials: "same-origin",
                            body: formData,
                          });
                          const payload = (await response.json()) as { url?: string; error?: string };
                          if (!response.ok || !payload.url) throw new Error(payload.error || "Unable to replace image.");
                          updateGallery(items.map((current) => current.id === item.id ? { ...current, image: payload.url } : current));
                          toast.success("Gallery image replaced.");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Unable to replace image.");
                        } finally {
                          event.target.value = "";
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete "${item.title}" from the gallery?`)) updateGallery(items.filter((current) => current.id !== item.id));
                    }}
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void publishWebsiteContent(websiteContent)}
            className="rounded-lg bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#262626]"
          >
            Publish Gallery
          </button>
        </div>
      </div>
    );
  }

  function renderWebsiteContentManager() {
    if (!websiteContent) {
      return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading website content…</div>;
    }
    const tabs = [
      { key: "home", label: "Homepage" },
      { key: "pages", label: "About & Contact" },
      { key: "gallery", label: "Gallery" },
      { key: "settings", label: "Contact & Social" },
      { key: "seo", label: "SEO" },
    ] as const;
    const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm";
    const updateHome = (path: "hero" | "productIntro" | "cta", key: string, value: string) =>
      setWebsiteContent({
        ...websiteContent,
        home: {
          ...websiteContent.home,
          [path]: { ...websiteContent.home[path], [key]: value },
        },
      } as WebsiteContent);
    const updatePage = (page: "products" | "about" | "contact", key: string, value: string) =>
      setWebsiteContent({
        ...websiteContent,
        pages: {
          ...websiteContent.pages,
          [page]: { ...websiteContent.pages[page], [key]: value },
        },
      } as WebsiteContent);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setContentView(tab.key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${contentView === tab.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {contentView === "home" ? (
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="font-semibold text-slate-900">Homepage Hero</h3>
                {[
                  ["eyebrow", "Eyebrow"],
                  ["title", "Heading"],
                  ["description", "Description"],
                  ["primaryLabel", "Primary button label"],
                  ["primaryHref", "Primary button URL"],
                  ["secondaryLabel", "Secondary button label"],
                  ["secondaryHref", "Secondary button URL"],
                  ["image", "Hero image"],
                  ["video", "Hero video"],
                ].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
                    <input
                      value={String((websiteContent.home.hero as any)[key] ?? "")}
                      onChange={(event) => updateHome("hero", key, event.target.value)}
                      className={inputClass}
                    />
                  </label>
                ))}
              </section>
              <section className="grid gap-3 md:grid-cols-2">
                <h3 className="font-semibold text-slate-900 md:col-span-2">Homepage CTA</h3>
                {[
                  ["title", "Heading"],
                  ["description", "Description"],
                  ["primaryLabel", "Button label"],
                  ["primaryHref", "Button URL"],
                  ["image", "Banner image"],
                ].map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
                    <input
                      value={String((websiteContent.home.cta as any)[key] ?? "")}
                      onChange={(event) => updateHome("cta", key, event.target.value)}
                      className={inputClass}
                    />
                  </label>
                ))}
              </section>
            </div>
          ) : null}
          {contentView === "pages" ? (
            <div className="grid gap-5 md:grid-cols-2">
              {(["products", "about", "contact"] as const).map((page) => (
                <section key={page} className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold capitalize text-slate-900">{page} Page</h3>
                  {Object.entries(websiteContent.pages[page])
                    .filter(([key, value]) => typeof value === "string" && key.toLowerCase().includes("hero"))
                    .map(([key, value]) => (
                      <label key={key} className="block">
                        <span className="mb-1.5 block text-xs font-medium text-slate-600">{key}</span>
                        <input
                          value={String(value)}
                          onChange={(event) => updatePage(page, key, event.target.value)}
                          className={inputClass}
                        />
                      </label>
                    ))}
                </section>
              ))}
            </div>
          ) : null}
          {contentView === "gallery" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["eyebrow", "Eyebrow"],
                ["title", "Gallery heading"],
                ["description", "Description"],
                ["heroImage", "Gallery hero image"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
                  <input
                    value={String((websiteContent.gallery as any)[key] ?? "")}
                    onChange={(event) =>
                      setWebsiteContent({
                        ...websiteContent,
                        gallery: { ...websiteContent.gallery, [key]: event.target.value },
                      } as WebsiteContent)
                    }
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          ) : null}
          {contentView === "seo" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(websiteContent.seo).map(([page, seo]) => (
                <section key={page} className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <h3 className="font-semibold capitalize text-slate-900">{page} SEO</h3>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600">Title</span>
                    <input
                      value={seo.title}
                      onChange={(event) =>
                        setWebsiteContent({
                          ...websiteContent,
                          seo: { ...websiteContent.seo, [page]: { ...seo, title: event.target.value } },
                        } as WebsiteContent)
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600">Meta description</span>
                    <textarea
                      value={seo.description}
                      onChange={(event) =>
                        setWebsiteContent({
                          ...websiteContent,
                          seo: { ...websiteContent.seo, [page]: { ...seo, description: event.target.value } },
                        } as WebsiteContent)
                      }
                      rows={3}
                      className={inputClass}
                    />
                  </label>
                </section>
              ))}
            </div>
          ) : null}
          {contentView === "settings" ? (
            <div>
              <p className="text-sm text-slate-500">Use Settings for contact information, social links and website configuration.</p>
              <button type="button" onClick={() => setSection("Settings")} className="mt-4 rounded-lg bg-[#111111] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#262626]">
                Open Settings
              </button>
            </div>
          ) : null}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void publishWebsiteContent(websiteContent)}
              className="rounded-lg bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#262626]"
            >
              Publish Content
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderMedia() {
    const images = [...new Set(products.flatMap((product) => [product.image]).filter(Boolean))];
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <label className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Upload image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleImageUpload(file, (value) => {
                    setProducts((current) =>
                      current.map((product, index) =>
                        index === 0 ? { ...product, image: value } : product,
                      ),
                    );
                  });
                }
              }}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <img src={image} alt="Media asset" className="h-36 w-full rounded-xl object-cover" />
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(image)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy URL
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setProducts((current) =>
                      current.map((product) =>
                        product.image === image ? { ...product, image: "" } : product,
                      ),
                    )
                  }
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderSettings() {
    if (!websiteContent) {
      return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading settings…</div>;
    }
    const settings = websiteContent.settings;
    const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm";
    const updateSetting = (key: "name" | "tagline" | "whatsappLocal" | "whatsappCountryCode" | "phoneDisplay" | "phoneLocal" | "email", value: string) =>
      setWebsiteContent({ ...websiteContent, settings: { ...settings, [key]: value } } as WebsiteContent);
    return (
      <form
        onSubmit={(event) => event.preventDefault()}
        className="space-y-5"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Contact Information</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {([
              ["name", "Website name"],
              ["tagline", "Tagline"],
              ["whatsappCountryCode", "WhatsApp country code"],
              ["whatsappLocal", "WhatsApp number"],
              ["phoneDisplay", "Display phone number"],
              ["phoneLocal", "Local phone number"],
              ["email", "Email address"],
            ] as const).map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
                <input value={String(settings[key] ?? "")} onChange={(event) => updateSetting(key, event.target.value)} className={inputClass} />
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Business Address</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">English address</span>
              <input value={settings.address.en} onChange={(event) => setWebsiteContent({ ...websiteContent, settings: { ...settings, address: { ...settings.address, en: event.target.value } } } as WebsiteContent)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Arabic address</span>
              <input dir="rtl" value={settings.address.ar} onChange={(event) => setWebsiteContent({ ...websiteContent, settings: { ...settings, address: { ...settings.address, ar: event.target.value } } } as WebsiteContent)} className={inputClass} />
            </label>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Social Media URLs</h2>
          <div className="mt-4 space-y-3">
            {settings.socialLinks.map((social, index) => (
              <div key={social.label} className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <input value={social.label} onChange={(event) => setWebsiteContent({ ...websiteContent, settings: { ...settings, socialLinks: settings.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) } } as WebsiteContent)} className={inputClass} />
                <input value={social.url} onChange={(event) => setWebsiteContent({ ...websiteContent, settings: { ...settings, socialLinks: settings.socialLinks.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) } } as WebsiteContent)} className={inputClass} />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">SEO</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Home title</span>
              <input value={websiteContent.seo.home.title} onChange={(event) => setWebsiteContent({ ...websiteContent, seo: { ...websiteContent.seo, home: { ...websiteContent.seo.home, title: event.target.value } } } as WebsiteContent)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Home meta description</span>
              <textarea rows={3} value={websiteContent.seo.home.description} onChange={(event) => setWebsiteContent({ ...websiteContent, seo: { ...websiteContent.seo, home: { ...websiteContent.seo.home, description: event.target.value } } } as WebsiteContent)} className={inputClass} />
            </label>
          </div>
        </section>
        <div className="flex justify-end">
          <button type="button" onClick={() => void publishWebsiteContent(websiteContent)} className="rounded-lg bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#262626]">Save Changes</button>
        </div>
      </form>
    );
  }

  function renderOrders() {
    const rows = [
      {
        id: "INQ-1021",
        customer: "Apex Car Wash",
        product: "Colour Wax Shampoo",
        status: "New",
        date: "2026-11-17",
      },
      {
        id: "INQ-1022",
        customer: "Greenline Detailing",
        product: "ChemX C2",
        status: "Pending",
        date: "2026-11-17",
      },
    ];
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Inquiry</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="px-4 py-3 font-medium text-slate-900">{row.id}</td>
                <td className="px-4 py-3">{row.customer}</td>
                <td className="px-4 py-3">{row.product}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderSection() {
    switch (section) {
      case "Dashboard":
        return renderDashboard();
      case "Products":
        return renderProducts();
      case "Gallery":
        return renderGalleryManager();
      case "Website Content":
        return renderWebsiteContentManager();
      case "Analytics":
        return renderAnalytics();
      case "Settings":
        return renderSettings();
      default:
        return renderDashboard();
    }
  }

  const titleMap: Record<AdminSection, string> = {
    Dashboard: "Dashboard",
    Products: "Products",
    Gallery: "Gallery",
    "Website Content": "Website Content",
    Analytics: "Analytics",
    Settings: "Settings",
  };

  const activeNavigation = showProductModal && !editingProductId ? "Products" : section;
  const accountRoute = location.pathname.startsWith("/admin/account/");
  const accountPageTitle =
    location.pathname.endsWith("/username") ? "Change Username" :
    location.pathname.endsWith("/email") ? "Change Email" :
    location.pathname.endsWith("/password") ? "Change Password" :
    location.pathname.endsWith("/security") ? "Security" :
    "Profile Information";

  return (
    <div data-admin-panel dir="ltr" className="min-h-screen bg-slate-50 text-left text-slate-900">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close admin navigation"
          className="fixed inset-0 z-20 bg-slate-950/50 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#080808] via-[#111111] to-[#191919] px-4 py-6 text-white shadow-[12px_0_40px_-24px_rgba(0,0,0,0.8)] transition-transform duration-300 md:translate-x-0 ${mobileNavOpen ? "flex translate-x-0" : "hidden -translate-x-full md:flex"}`}
      >
        <div className="mb-8 flex items-center gap-3 border-b border-white/10 px-2 pb-6">
          <img src={adminLogo} alt="AutoUp" className="h-10 w-auto object-contain" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              AutoUp
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-white">Admin panel</h2>
          </div>
        </div>

        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Workspace
        </p>
        <nav className="space-y-1">
          {SIDEBAR_MENU.filter((item) => item !== "Logout").map((item) => {
            const Icon =
              item === "Dashboard" ? LayoutDashboard :
              item === "Products" ? Package2 :
              item === "Gallery" ? Images :
              item === "Website Content" ? Globe2 :
              item === "Analytics" ? BarChart3 :
              Settings;
            const active = activeNavigation === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  if (item === "Add Product") {
                    setSection("Products");
                    openProductModal();
                  } else {
                    setSection(item);
                    if (location.pathname.startsWith("/admin/account/")) {
                      void navigate({ to: "/admin" });
                    }
                  }
                  setMobileNavOpen(false);
                }}
                aria-current={active ? "page" : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-200 ${active ? "bg-white/[0.11] text-white shadow-sm" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}
              >
                <Icon
                  className={`h-[18px] w-[18px] ${active ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}
                />
                <span>{item}</span>
                {active ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70" />
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px] text-slate-400 transition-colors group-hover:text-slate-200" />
            Logout
          </button>
        </div>
      </aside>

      <div className="md:ml-64">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 text-slate-900 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open admin navigation"
              aria-expanded={mobileNavOpen}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 md:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                AutoUp / Admin
              </p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
                {accountRoute ? accountPageTitle : titleMap[section]}
              </h1>
            </div>
            <div className="relative ml-auto">
              <button
                type="button"
                aria-expanded={showProfileMenu}
                aria-haspopup="dialog"
                onClick={() => setShowProfileMenu((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-left transition hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="hidden sm:block">
                  <span className="block text-xs font-semibold text-slate-900">{profile.name || "Admin"}</span>
                  <span className="block text-[10px] text-slate-500">Admin</span>
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showProfileMenu ? "rotate-180" : ""}`} />
              </button>
              {showProfileMenu ? (
                <div
                  role="menu"
                  aria-label="Admin account menu"
                  className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-xl shadow-slate-900/10"
                >
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Admin Account</p>
                  {([
                    ["Profile Information", "/admin/account/profile"],
                    ["Change Username", "/admin/account/username"],
                    ["Change Email", "/admin/account/email"],
                    ["Change Password", "/admin/account/password"],
                    ["Security", "/admin/account/security"],
                  ] as const).map(([label, href]) => (
                    <Link
                      key={href}
                      role="menuitem"
                      to={href}
                      onClick={() => setShowProfileMenu(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                    >
                      {label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-2 w-full border-t border-slate-100 px-3 pt-3 text-left text-sm font-medium text-slate-600 hover:text-slate-950"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">
                {section === "Analytics"
                  ? "Understand how customers engage with your products."
                  : section === "Gallery"
                    ? "Manage gallery images, categories and order."
                    : section === "Website Content"
                      ? "Edit existing website copy and media."
                      : section === "Settings"
                        ? "Manage contact details, SEO and website configuration."
                        : "Manage the live AutoUp website."}
              </p>
            </div>
            {section === "Products" ? (
              <button
                type="button"
                onClick={() => openProductModal()}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#111111] px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#262626]"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            ) : null}
          </div>
          {dataError ? (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              {dataError}
            </div>
          ) : null}
          {accountRoute ? <Outlet /> : renderSection()}
        </main>
      </div>

      {showProductModal ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingProductId ? "Edit Product" : "Add Product"}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <form onSubmit={saveProduct} className="space-y-5">
              {productError ? (
                <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {productError}
                </p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  value={productDraft.name}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="English name"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <input
                  value={productDraft.nameAr}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, nameAr: event.target.value }))
                  }
                  placeholder="Arabic name"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <input
                  value={productDraft.sku}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, sku: event.target.value }))
                  }
                  placeholder="SKU"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <input
                  value={productDraft.slug}
                  disabled={Boolean(editingProductId)}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, slug: event.target.value }))
                  }
                  placeholder="Product URL slug"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <input
                  value={productDraft.code}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, code: event.target.value }))
                  }
                  placeholder="Product code"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <select
                  value={productDraft.category}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  value={productDraft.packageSize}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, packageSize: event.target.value }))
                  }
                  placeholder="Package size"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <input
                  type="number"
                  value={productDraft.price}
                  onChange={(event) =>
                    setProductDraft((current) => ({
                      ...current,
                      price: Number(event.target.value),
                    }))
                  }
                  placeholder="Price"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <input
                  type="number"
                  value={productDraft.salePrice ?? ""}
                  onChange={(event) =>
                    setProductDraft((current) => ({
                      ...current,
                      salePrice: event.target.value === "" ? undefined : Number(event.target.value),
                    }))
                  }
                  placeholder="Sale price"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <input
                  type="number"
                  value={productDraft.stock}
                  onChange={(event) =>
                    setProductDraft((current) => ({
                      ...current,
                          stock: event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                  placeholder="Stock"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <select
                  value={productDraft.status}
                  onChange={(event) =>
                    setProductDraft((current) => ({
                      ...current,
                      status: event.target.value as "draft" | "published",
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
                <select
                  value={productDraft.packageType}
                  onChange={(event) =>
                    setProductDraft((current) => ({
                      ...current,
                      packageType: event.target.value as AdminProduct["packageType"],
                    }))
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="retail">Retail</option>
                  <option value="gallon">Gallon</option>
                  <option value="other-commercial">Other commercial</option>
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <textarea
                  value={productDraft.short}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, short: event.target.value }))
                  }
                  rows={2}
                  placeholder="Short description"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <textarea
                  value={productDraft.usage}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, usage: event.target.value }))
                  }
                  rows={2}
                  placeholder="Usage instructions"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <textarea
                  value={productDraft.description}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={4}
                  placeholder="English description"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
                <textarea
                  value={productDraft.descriptionAr}
                  onChange={(event) =>
                    setProductDraft((current) => ({
                      ...current,
                      descriptionAr: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Arabic description"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <ImagePlus className="h-4 w-4" /> Product image
                </div>
                <label className="inline-flex cursor-pointer items-center rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingImage}
                    className="hidden"
                    onChange={(event) =>
                      handleImageUpload(event.target.files?.[0] ?? null, (image) =>
                        setProductDraft((current) => ({
                          ...current,
                          image,
                          images: [...(current.images?.length ? current.images : current.image ? [current.image] : []), image]
                            .filter((value, index, values) => values.indexOf(value) === index),
                        })),
                      )
                    }
                  />
                </label>
                <label className="ml-2 inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                  Upload multiple
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploadingImage}
                    className="hidden"
                    onChange={async (event) => {
                      const files = [...(event.target.files ?? [])];
                      if (!files.length) return;
                      setIsUploadingImage(true);
                      try {
                        const formData = new FormData();
                        files.forEach((file) => formData.append("files", file));
                        const response = await fetch("/api/admin/media", {
                          method: "POST",
                          credentials: "same-origin",
                          body: formData,
                        });
                        const payload = (await response.json()) as { images?: Array<{ url: string }>; error?: string };
                        if (!response.ok || !payload.images) throw new Error(payload.error || "Unable to upload images.");
                        const uploaded = payload.images.map((image) => image.url);
                        setProductDraft((current) => {
                          const existing = current.images?.length ? current.images : current.image ? [current.image] : [];
                          const images = [...new Set([...existing, ...uploaded])];
                          return { ...current, images, image: images[0] || "" };
                        });
                      } catch (error) {
                        setImageUploadError(error instanceof Error ? error.message : "Unable to upload images.");
                      } finally {
                        setIsUploadingImage(false);
                        event.target.value = "";
                      }
                    }}
                  />
                </label>
                {isUploadingImage ? (
                  <p className="mt-2 text-xs text-slate-500">Uploading image...</p>
                ) : null}
                {imageUploadError ? (
                  <p role="alert" className="mt-2 text-xs text-red-600">
                    {imageUploadError}
                  </p>
                ) : null}
                {(productDraft.images?.length ? productDraft.images : productDraft.image ? [productDraft.image] : []).length ? (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {(productDraft.images?.length ? productDraft.images : [productDraft.image]).filter(Boolean).map((image, index) => (
                      <div key={`${image}-${index}`} className="relative">
                        <img src={image} alt={`Product image ${index + 1}`} className="h-28 w-28 rounded-xl object-cover" />
                        <button
                          type="button"
                          onClick={() => setProductDraft((current) => {
                            const images = (current.images?.length ? current.images : current.image ? [current.image] : []).filter((value) => value !== image);
                            return { ...current, images, image: images[0] || "" };
                          })}
                          className="absolute right-1 top-1 rounded-full bg-white px-1.5 py-0.5 text-xs text-red-600 shadow"
                        >
                          ×
                        </button>
                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => setProductDraft((current) => {
                              const images = [...(current.images?.length ? current.images : current.image ? [current.image] : [])];
                              [images[index - 1], images[index]] = [images[index], images[index - 1]];
                              return { ...current, images, image: images[0] || "" };
                            })}
                            className="absolute bottom-1 left-1 rounded bg-white px-1.5 text-xs text-slate-700 shadow"
                            aria-label="Move image earlier"
                          >
                            ←
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showCategoryModal ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">
              {categoryDraft.id ? "Edit Category" : "Add Category"}
            </h3>
            <form onSubmit={saveCategory} className="mt-5 space-y-4">
              <input
                value={categoryDraft.name}
                onChange={(event) =>
                  setCategoryDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Category name"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <input
                value={categoryDraft.nameAr}
                onChange={(event) =>
                  setCategoryDraft((current) => ({ ...current, nameAr: event.target.value }))
                }
                placeholder="Arabic category name"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <textarea
                value={categoryDraft.description}
                onChange={(event) =>
                  setCategoryDraft((current) => ({ ...current, description: event.target.value }))
                }
                rows={3}
                placeholder="Description"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
              <label className="block text-sm font-medium text-slate-700">
                Upload category image
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm"
                  onChange={(event) =>
                    handleImageUpload(event.target.files?.[0] ?? null, (image) =>
                      setCategoryDraft((current) => ({ ...current, image })),
                    )
                  }
                />
              </label>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  component: function AdminRoute() {
    const location = useLocation();
    const navigate = useNavigate();
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);
    const [adminProfile, setAdminProfile] = useState<ProfileState | null>(null);
    useEffect(() => {
      if (location.pathname === "/admin/login" || authenticated) return;
      let active = true;
      fetch("/api/admin/session", { credentials: "same-origin" })
        .then(async (response) => {
          if (!active) return;
          if (response.status === 401) {
            void navigate({ to: "/admin/login", replace: true });
            return;
          }
          if (!response.ok) {
            void navigate({ to: "/admin/login", replace: true });
            return;
          }
          const payload = (await response.json()) as { admin?: ProfileState };
          if (!active) return;
          setAdminProfile(payload.admin ?? readAdminProfile());
          setAuthenticated(true);
        })
        .catch(() => {
          if (active) void navigate({ to: "/admin/login", replace: true });
        });
      return () => {
        active = false;
      };
    }, [authenticated, location.pathname, navigate]);
    if (location.pathname === "/admin/login") return <Outlet />;
    if (authenticated === null) {
      return (
        <div
          dir="ltr"
          className="flex min-h-screen items-center justify-center bg-slate-950 text-left text-sm text-slate-300"
        >
          Loading AutoUp Admin...
        </div>
      );
    }
    return authenticated ? (
      <AdminApp initialAdmin={adminProfile ?? readAdminProfile()} />
    ) : (
      <AdminLoginScreen />
    );
  },
});
