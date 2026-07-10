// lib/auth.ts
// سیستم لاگین ساده و کاملاً سمت کلاینت — بدون بک‌اند، بدون پیامک.
// فقط اسم و شماره تلفن رو توی localStorage مرورگر ذخیره می‌کنه.

export interface AuthUser {
  fullName: string;
  phone: string;
}

const STORAGE_KEY = "ai-stylist-auth-user";
const AUTH_CHANGE_EVENT = "ai-stylist-auth-change";

function isBrowser() {
  return typeof window !== "undefined";
}

/** اطلاعات کاربر لاگین‌شده رو برمی‌گردونه، یا null اگه لاگین نکرده */
export function getUser(): AuthUser | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** کاربر رو لاگین می‌کنه و اطلاعاتش رو ذخیره می‌کنه */
export function setUser(user: AuthUser): void {
  if (!isBrowser()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

/** خروج از حساب کاربری */
export function clearUser(): void {
  if (!isBrowser()) return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}

/**
 * هوک برای گوش دادن به تغییرات لاگین/لاگ‌اوت توی کامپوننت‌ها
 * (مثلاً Navbar باید بلافاصله بعد از لاگین آپدیت بشه)
 */
export function subscribeToAuthChanges(callback: () => void): () => void {
  if (!isBrowser()) return () => {};

  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback); // برای سینک بین تب‌ها

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}