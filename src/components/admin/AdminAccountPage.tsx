import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ChevronRight, Eye, EyeOff, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

type AccountAdmin = {
  name: string;
  username: string;
  email: string;
  role: string;
};

type AccountPage = "profile" | "username" | "email" | "password" | "security";

const fieldClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

const labels: Record<AccountPage, string> = {
  profile: "Profile Information",
  username: "Change Username",
  email: "Change Email",
  password: "Change Password",
  security: "Security",
};

export function AdminAccountPage({ page }: { page: AccountPage }) {
  const [admin, setAdmin] = useState<AccountAdmin>({
    name: "",
    username: "",
    email: "",
    role: "Super Admin",
  });
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    confirmUsername: "",
    newUsername: "",
    email: "",
    newEmail: "",
    confirmEmail: "",
    currentPassword: "",
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { admin?: AccountAdmin; error?: string };
        if (!response.ok || !payload.admin) throw new Error(payload.error || "Unable to load admin account.");
        if (!active) return;
        const account = payload.admin;
        setAdmin(account);
        setForm((current) => ({
          ...current,
          displayName: account.name,
          username: account.username,
          email: account.email,
        }));
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load admin account.");
      });
    return () => {
      active = false;
    };
  }, []);

  const passwordFields = page === "password";
  const currentPasswordKey = passwordFields ? "oldPassword" : "currentPassword";
  const currentPasswordLabel = passwordFields ? "Old Password" : "Current password";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    let endpoint = "";
    let payload: Record<string, string> = {};
    if (page === "profile") {
      if (!form.displayName.trim()) return setError("Enter a display name.");
      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(form.username.trim())) return setError("Username must be 3–32 characters using letters, numbers, dots, underscores or hyphens.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError("Enter a valid email address.");
      endpoint = "/api/admin/account/profile";
      payload = {
        displayName: form.displayName,
        username: form.username,
        email: form.email,
        currentPassword: form.currentPassword,
      };
    } else if (page === "username") {
      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(form.newUsername.trim())) return setError("Username must be 3–32 characters using letters, numbers, dots, underscores or hyphens.");
      if (form.newUsername.trim() !== form.confirmUsername.trim()) return setError("Username confirmation does not match.");
      endpoint = "/api/admin/account/username";
      payload = {
        newUsername: form.newUsername,
        confirmUsername: form.confirmUsername,
        currentPassword: form.currentPassword,
      };
    } else if (page === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail.trim())) return setError("Enter a valid email address.");
      if (form.newEmail.trim().toLowerCase() !== form.confirmEmail.trim().toLowerCase()) return setError("Email confirmation does not match.");
      endpoint = "/api/admin/account/email";
      payload = {
        newEmail: form.newEmail,
        confirmEmail: form.confirmEmail,
        currentPassword: form.currentPassword,
      };
    } else if (page === "password") {
      if (!form.oldPassword || !form.newPassword || !form.confirmNewPassword) return setError("Complete all three password fields.");
      if (form.newPassword !== form.confirmNewPassword) return setError("New password and confirmation do not match.");
      if (
        form.newPassword.length < 12 ||
        !/[a-z]/.test(form.newPassword) ||
        !/[A-Z]/.test(form.newPassword) ||
        !/\d/.test(form.newPassword) ||
        !/[^a-zA-Z0-9]/.test(form.newPassword)
      ) {
        return setError("Use 12+ characters with uppercase, lowercase, a number, and a symbol.");
      }
      endpoint = "/api/admin/account/password";
      payload = {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
        confirmNewPassword: form.confirmNewPassword,
      };
    } else {
      if (!form.currentPassword) return setError("Enter your current password to sign out other sessions.");
      endpoint = "/api/admin/account/security/sessions";
      payload = { currentPassword: form.currentPassword };
    }

    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        admin?: AccountAdmin;
        error?: string;
        message?: string;
        verification?: string;
      };
      if (!response.ok) throw new Error(result.error || "Unable to save account changes.");

      if (result.admin) setAdmin(result.admin);
      if (page === "security") {
        setForm((current) => ({ ...current, currentPassword: "" }));
        toast.success(result.message || "Other sessions signed out.");
      } else if (page === "password") {
        toast.success(result.message || "Password updated successfully.");
        window.setTimeout(() => window.location.assign("/admin/login"), 1600);
      } else {
        if (result.verification) toast.info(result.verification);
        toast.success("Account changes saved. Sign in again with your updated credentials.");
        window.setTimeout(() => window.location.assign("/admin/login"), 1600);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to save account changes.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function textField(
    key:
      | "displayName"
      | "username"
      | "newUsername"
      | "confirmUsername"
      | "email"
      | "newEmail"
      | "confirmEmail",
    label: string,
    type: string = "text",
    readOnly = false,
  ) {
    return (
      <label className="block space-y-1.5" key={key}>
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <input
          type={type}
          value={form[key]}
          readOnly={readOnly}
          onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
          className={`${fieldClass} ${readOnly ? "bg-slate-50 text-slate-500" : ""}`}
        />
      </label>
    );
  }

  function passwordField(
    key: "currentPassword" | "oldPassword" | "newPassword" | "confirmNewPassword",
    label: string,
    required = true,
  ) {
    return (
      <label className="block space-y-1.5" key={key}>
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="relative block">
          <input
            type={passwordVisible ? "text" : "password"}
            autoComplete={key === "oldPassword" || key === "currentPassword" ? "current-password" : "new-password"}
            required={required}
            value={form[key]}
            onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
            className={`${fieldClass} pr-12`}
          />
          <button
            type="button"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute inset-y-0 right-3 text-slate-500 hover:text-slate-900"
          >
            {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>
    );
  }

  const card = (children: ReactNode) => (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      {children}
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <a href="/admin" className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</a>
        <button type="submit" disabled={saving} className="rounded-lg bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#262626] disabled:opacity-60">
          {saving ? "Saving…" : page === "security" ? "Log out other sessions" : "Save Changes"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
            <a href="/admin" className="hover:text-slate-900">Admin</a>
            <ChevronRight className="h-3 w-3" />
            <span>Admin Account</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-800">{labels[page]}</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{labels[page]}</h2>
        </div>
        <a href="/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">← Back to Admin Account</a>
      </div>

      <nav aria-label="Admin account pages" className="flex flex-wrap gap-2">
        {(["profile", "username", "email", "password", "security"] as const).map((item) => (
          <a
            key={item}
            href={`/admin/account/${item}`}
            aria-current={page === item ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${page === item ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {labels[item]}
          </a>
        ))}
      </nav>

      {page === "profile" ? card(
        <>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700"><UserRound className="h-5 w-5" /></span>
            <div><p className="font-semibold text-slate-900">{admin.name || "Admin"}</p><p className="text-xs text-slate-500">{admin.role}</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {textField("displayName", "Display name")}
            {textField("username", "Username")}
            {textField("email", "Login email", "email")}
            {passwordField("currentPassword", "Current password")}
          </div>
        </>,
      ) : null}
      {page === "username" ? card(
        <>
          <p className="text-sm text-slate-500">Update the username used to identify your administrator account.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {textField("username", "Current username", "text", true)}
            {passwordField("currentPassword", "Current password")}
            {textField("newUsername", "New username")}
            {textField("confirmUsername", "Confirm username")}
          </div>
          <p className="text-xs text-slate-500 sm:col-span-2">Use 3–32 letters, numbers, dots, underscores, or hyphens.</p>
        </>,
      ) : null}
      {page === "email" ? card(
        <>
          <p className="text-sm text-slate-500">Your updated email becomes the login email. Email verification is only available when a mail provider is configured.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {textField("email", "Current email", "email", true)}
            {passwordField("currentPassword", "Current password")}
            {textField("newEmail", "New email", "email")}
            {textField("confirmEmail", "Confirm new email", "email")}
          </div>
        </>,
      ) : null}
      {page === "password" ? card(
        <>
          <p className="text-sm text-slate-500">Use a unique password. Changing it signs out other active sessions.</p>
          <div className="space-y-4">
            {passwordField("oldPassword", "Old Password")}
            {passwordField("newPassword", "New Password")}
            {passwordField("confirmNewPassword", "Confirm New Password")}
          </div>
          <p className="text-xs text-slate-500">At least 12 characters with uppercase, lowercase, a number, and a symbol.</p>
        </>,
      ) : null}
      {page === "security" ? card(
        <>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-slate-700" />
            <div>
              <h3 className="font-semibold text-slate-900">Login sessions</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                This admin uses signed, stateless sessions, so active devices cannot be listed. You can sign out all other sessions; this browser stays signed in.
              </p>
            </div>
          </div>
          {passwordField("currentPassword", "Current password to verify")}
        </>,
      ) : null}
    </div>
  );
}
