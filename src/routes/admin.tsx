import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Box,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  ImagePlus,
  LogOut,
  Package2,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import adminLogo from "@/assets/autoup-final-logo.webp";

const ADMIN_MENU = [
  "Overview",
  "Products",
  "Add Product",
  "Categories",
  "Inventory",
  "Orders & Inquiries",
  "Customers",
  "Media Library",
  "Website Settings",
  "Activity Logs",
] as const;

type AdminSection = (typeof ADMIN_MENU)[number];

type AdminProduct = {
  id: string;
  name: string;
  nameAr: string;
  sku: string;
  category: string;
  packageSize: string;
  price: number;
  stock: number;
  status: "draft" | "published";
  image: string;
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
    name: "",
    nameAr: "",
    sku: "AUTO-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
    category: "Car Shampoo",
    packageSize: "20 L",
    price: 0,
    stock: 0,
    status: "draft",
    image: "",
    updatedAt: new Date().toISOString(),
    brand: "AutoUp",
    description: "",
    descriptionAr: "",
  };
}

function AdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/state")
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

function AdminApp() {
  const [section, setSection] = useState<AdminSection>("Overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [profile, setProfile] = useState<ProfileState>(() => readAdminProfile());
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [settingsView, setSettingsView] = useState<
    "profile" | "account" | "password" | "notifications"
  >("profile");
  const [notificationPreferences, setNotificationPreferences] = useState({
    lowStock: true,
    newInquiries: true,
    inventoryUpdates: true,
  });
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<AdminProduct>(() => createEmptyProduct());
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
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload) return;
        if (Array.isArray(payload.products) && payload.products.length)
          setProducts(payload.products);
        if (Array.isArray(payload.categories)) setCategories(payload.categories);
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
        if (payload.admin) setProfile(payload.admin);
      })
      .catch(() => undefined);
  }, []);

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
    const outOfStock = products.filter((product) => product.stock <= 0).length;
    const totalInquiries = 18 + products.length;
    return {
      totalProducts: products.length,
      published,
      draft,
      outOfStock,
      categories: categories.length,
      totalInquiries,
    };
  }, [products, categories]);

  const unreadCount = notifications.filter((item) => !item.read).length;

  function handleLogout() {
    fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }).finally(() =>
      window.location.assign("/admin"),
    );
  }

  function handleProfileMenuAction(item: string) {
    if (item === "Logout") {
      handleLogout();
      return;
    }

    setShowProfileMenu(false);

    if (item === "My Profile") {
      setSection("Website Settings");
      setSettingsView("profile");
      return;
    }

    if (item === "Account Settings") {
      setSection("Website Settings");
      setSettingsView("account");
      return;
    }

    if (item === "Change Password") {
      setSection("Website Settings");
      setSettingsView("password");
      return;
    }

    if (item === "Notification Preferences") {
      setSection("Website Settings");
      setSettingsView("notifications");
    }
  }

  function saveAccountSettings(event: FormEvent) {
    event.preventDefault();
    const nextEmail = profile.email.trim();
    if (!profile.name.trim() || !nextEmail) return;
    fetch("/api/admin/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name: profile.name.trim(), email: nextEmail }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.admin) setProfile(payload.admin);
      });
  }

  function changePassword(event: FormEvent) {
    event.preventDefault();
    const current = passwordDraft.currentPassword;
    const next = passwordDraft.newPassword.trim();
    const confirm = passwordDraft.confirmPassword.trim();

    if (!current || !next || !confirm) {
      setPasswordMessage({ type: "error", text: "Please fill in all password fields." });
      return;
    }

    if (next.length < 8) {
      setPasswordMessage({
        type: "error",
        text: "New password must be at least 8 characters long.",
      });
      return;
    }

    if (next !== confirm) {
      setPasswordMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    fetch("/api/admin/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
      .then(async (response) => ({
        response,
        payload: (await response.json()) as { error?: string },
      }))
      .then(({ response, payload }) => {
        if (!response.ok) {
          setPasswordMessage({
            type: "error",
            text: payload.error || "Unable to update password.",
          });
          return;
        }
        setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordMessage({ type: "success", text: "Password updated successfully." });
      });
  }

  function openProductModal(product?: AdminProduct) {
    if (product) {
      setEditingProductId(product.id);
      setProductDraft({ ...product });
    } else {
      setEditingProductId(null);
      setProductDraft(createEmptyProduct());
    }
    setShowProductModal(true);
  }

  function saveProduct(event: FormEvent) {
    event.preventDefault();
    if (!productDraft.name.trim() || !productDraft.sku.trim()) return;
    const payload = editingProductId
      ? { ...productDraft, id: editingProductId }
      : { ...productDraft, id: "" };
    fetch("/api/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((saved) => {
        if (!saved) return;
        setProducts((current) => {
          const existing = current.findIndex((product) => product.id === saved.id);
          if (existing >= 0)
            return current.map((product) => (product.id === saved.id ? saved : product));
          return [saved, ...current];
        });
        setShowProductModal(false);
        setSection("Products");
      });
  }

  function duplicateProduct(product: AdminProduct) {
    const duplicate = {
      ...product,
      id: crypto.randomUUID(),
      sku: `${product.sku}-COPY`,
      name: `${product.name} Copy`,
      updatedAt: new Date().toISOString(),
    };
    setProducts((current) => [duplicate, ...current]);
  }

  function deleteProduct(id: string) {
    fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id }),
    }).then((response) => {
      if (response.ok) setProducts((current) => current.filter((product) => product.id !== id));
    });
  }

  function togglePublish(productId: string, nextStatus: "published" | "draft") {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? { ...product, status: nextStatus, updatedAt: new Date().toISOString() }
          : product,
      ),
    );
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

  function handleImageUpload(file: File | null, callback: (value: string) => void) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  function renderDashboard() {
    const recentProducts = [...products].slice(0, 4);
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Total Products",
              value: stats.totalProducts,
              icon: <Box className="h-4 w-4" />,
            },
            {
              label: "Published Products",
              value: stats.published,
              icon: <Store className="h-4 w-4" />,
            },
            { label: "Draft Products", value: stats.draft, icon: <Wand2 className="h-4 w-4" /> },
            {
              label: "Out of Stock",
              value: stats.outOfStock,
              icon: <Trash2 className="h-4 w-4" />,
            },
            {
              label: "Total Inquiries",
              value: stats.totalInquiries,
              icon: <Users className="h-4 w-4" />,
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-sm">{card.label}</span>
                <span className="rounded-full bg-primary/10 p-2 text-primary">{card.icon}</span>
              </div>
              <div className="mt-4 text-3xl font-bold text-slate-900">{card.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Recent products</h2>
              <button
                type="button"
                onClick={() => setSection("Products")}
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {recentProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image || "https://images.unsplash.com/..."}
                      alt={product.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.category}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${product.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {product.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => openProductModal()}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Add New Product
              </button>
              <button
                type="button"
                onClick={() => setSection("Products")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Manage Products
              </button>
              <button
                type="button"
                onClick={() => setSection("Categories")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Add Category
              </button>
              <button
                type="button"
                onClick={() => setSection("Orders & Inquiries")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                View Inquiries
              </button>
            </div>
          </div>
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
            <button
              type="button"
              onClick={() => openProductModal()}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Add Product
            </button>
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
                      <img
                        src={product.image || "https://images.unsplash.com/..."}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                    <td className="px-4 py-3 text-slate-600">{product.sku}</td>
                    <td className="px-4 py-3 text-slate-600">{product.category}</td>
                    <td className="px-4 py-3 text-slate-600">{toCurrency(product.price)}</td>
                    <td className="px-4 py-3 text-slate-600">{product.stock}</td>
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
                          onClick={() => duplicateProduct(product)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          Duplicate
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
                  <td className="px-4 py-3 text-slate-600">{product.stock}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${product.stock <= 5 ? "bg-amber-100 text-amber-700" : product.stock <= 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      {product.stock <= 0
                        ? "Out of stock"
                        : product.stock <= 5
                          ? "Low stock"
                          : "Available"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setProducts((current) =>
                          current.map((item) =>
                            item.id === product.id
                              ? { ...item, stock: Math.max(0, item.stock + 1) }
                              : item,
                          ),
                        )
                      }
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
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {[
            { key: "profile", label: "My Profile" },
            { key: "account", label: "Account Settings" },
            { key: "password", label: "Change Password" },
            { key: "notifications", label: "Notification Preferences" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                setSettingsView(tab.key as "profile" | "account" | "password" | "notifications")
              }
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${settingsView === tab.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {settingsView === "profile" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">My Profile</h3>
            <div className="mt-4 space-y-4">
              <input
                value={profile.name}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Full name"
              />
              <input
                value={profile.role}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, role: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Role"
              />
              <button
                type="button"
                onClick={() =>
                  setProfile((current) => ({
                    ...current,
                    name: current.name.trim() || "Admin User",
                  }))
                }
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save profile
              </button>
            </div>
          </div>
        ) : null}

        {settingsView === "account" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Account Settings</h3>
            <form className="mt-4 space-y-4" onSubmit={saveAccountSettings}>
              <input
                value={profile.name}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Username"
              />
              <input
                value={profile.email}
                onChange={(event) =>
                  setProfile((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Email address"
                type="email"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Update account
              </button>
            </form>
          </div>
        ) : null}

        {settingsView === "password" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Change Password</h3>
            <form className="mt-4 space-y-4" onSubmit={changePassword}>
              <input
                type="password"
                value={passwordDraft.currentPassword}
                onChange={(event) =>
                  setPasswordDraft((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Current password"
              />
              <input
                type="password"
                value={passwordDraft.newPassword}
                onChange={(event) =>
                  setPasswordDraft((current) => ({ ...current, newPassword: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="New password"
              />
              <input
                type="password"
                value={passwordDraft.confirmPassword}
                onChange={(event) =>
                  setPasswordDraft((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                placeholder="Confirm new password"
              />
              {passwordMessage ? (
                <div
                  className={`rounded-xl border px-3 py-2 text-sm ${passwordMessage.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
                >
                  {passwordMessage.text}
                </div>
              ) : null}
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Update password
              </button>
            </form>
          </div>
        ) : null}

        {settingsView === "notifications" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Notification Preferences</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                <span>Low stock alerts</span>
                <input
                  type="checkbox"
                  checked={notificationPreferences.lowStock}
                  onChange={(event) =>
                    setNotificationPreferences((current) => ({
                      ...current,
                      lowStock: event.target.checked,
                    }))
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                <span>New inquiries</span>
                <input
                  type="checkbox"
                  checked={notificationPreferences.newInquiries}
                  onChange={(event) =>
                    setNotificationPreferences((current) => ({
                      ...current,
                      newInquiries: event.target.checked,
                    }))
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                <span>Inventory updates</span>
                <input
                  type="checkbox"
                  checked={notificationPreferences.inventoryUpdates}
                  onChange={(event) =>
                    setNotificationPreferences((current) => ({
                      ...current,
                      inventoryUpdates: event.target.checked,
                    }))
                  }
                />
              </label>
            </div>
          </div>
        ) : null}
      </div>
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
      case "Overview":
        return renderDashboard();
      case "Products":
        return renderProducts();
      case "Add Product":
        return <div>{renderProducts()} </div>;
      case "Categories":
        return renderCategories();
      case "Inventory":
        return renderInventory();
      case "Orders & Inquiries":
        return renderOrders();
      case "Customers":
        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            Customer controls are available from the active admin records.
          </div>
        );
      case "Media Library":
        return renderMedia();
      case "Website Settings":
        return renderSettings();
      case "Activity Logs":
        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            Activity logs show recent admin actions and stock updates.
          </div>
        );
      default:
        return renderDashboard();
    }
  }

  const titleMap: Record<AdminSection, string> = {
    Overview: "Overview",
    Products: "Products",
    "Add Product": "Add Product",
    Categories: "Categories",
    Inventory: "Inventory",
    "Orders & Inquiries": "Orders & Inquiries",
    Customers: "Customers",
    "Media Library": "Media Library",
    "Website Settings": "Website Settings",
    "Activity Logs": "Activity Logs",
  };

  return (
    <div dir="ltr" className="min-h-screen bg-slate-100 text-left text-slate-900">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close admin navigation"
          className="fixed inset-0 z-20 bg-slate-950/40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 flex-col border-r border-slate-200 bg-white/95 p-5 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.35)] backdrop-blur-md ${mobileNavOpen ? "flex" : "hidden md:flex"}`}
      >
        <div className="mb-7 flex items-center gap-3 border-b border-slate-200 pb-5">
          <img src={adminLogo} alt="AutoUp" className="h-10 w-auto" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              AutoUp
            </p>
            <h2 className="text-lg font-bold text-slate-900">Admin Panel</h2>
          </div>
        </div>

        <nav className="space-y-1.5">
          {ADMIN_MENU.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setSection(item);
                setShowProfileMenu(false);
                setMobileNavOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${section === item ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              <span>{item}</span>
              {section === item ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
            </button>
          ))}
        </nav>
      </aside>

      <div className="md:ml-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 text-slate-900 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open admin navigation"
                aria-expanded={mobileNavOpen}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm md:hidden"
                onClick={() => setMobileNavOpen(true)}
              >
                Menu
              </button>
              <div className="flex items-center gap-3 md:hidden">
                <img src={adminLogo} alt="AutoUp" className="h-9 w-auto" />
                <div className="hidden sm:block">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">AutoUp</p>
                  <h1 className="text-base font-bold text-slate-900">Admin Panel</h1>
                </div>
              </div>
            </div>

            <div className="hidden flex-1 justify-center px-4 lg:flex">
              <div className="relative w-full max-w-xl">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products, SKU, customers..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-12 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  ⌘K
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </button>
                {showNotifications ? (
                  <div className="absolute right-0 top-12 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-slate-200/70">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() =>
                          setNotifications((current) =>
                            current.map((item) =>
                              item.id === notification.id ? { ...item, read: true } : item,
                            ),
                          )
                        }
                        className={`block w-full rounded-xl p-3 text-left ${notification.read ? "bg-slate-50" : "bg-primary/5"}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-900">{notification.title}</p>
                          {!notification.read ? (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{notification.detail}</p>
                        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                          {notification.time}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                AR / EN
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left shadow-sm transition hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                    AU
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-slate-900">{profile.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      {profile.role}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>

                {showProfileMenu ? (
                  <div className="absolute right-0 top-14 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-slate-200/70">
                    {[
                      "My Profile",
                      "Account Settings",
                      "Change Password",
                      "Notification Preferences",
                      "Logout",
                    ].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleProfileMenuAction(item)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                      >
                        {item}
                        {item === "Logout" ? <LogOut className="h-4 w-4 text-slate-400" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">{renderSection()}</main>
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
                  value={productDraft.stock}
                  onChange={(event) =>
                    setProductDraft((current) => ({
                      ...current,
                      stock: Number(event.target.value),
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                    className="hidden"
                    onChange={(event) =>
                      handleImageUpload(event.target.files?.[0] ?? null, (image) =>
                        setProductDraft((current) => ({ ...current, image })),
                      )
                    }
                  />
                </label>
                {productDraft.image ? (
                  <img
                    src={productDraft.image}
                    alt="Selected product"
                    className="mt-3 h-28 w-28 rounded-xl object-cover"
                  />
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
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);
    useEffect(() => {
      fetch("/api/admin/state", { credentials: "same-origin" })
        .then((response) => setAuthenticated(response.ok))
        .catch(() => setAuthenticated(false));
    }, []);
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
    return authenticated ? <AdminApp /> : <AdminLoginScreen />;
  },
});
