"use client";

import { useEffect, useState } from "react";
import { User, Phone, LogOut, LogIn, Heart, Edit3, Lock, Check, X, Eye, EyeOff } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { updateUserName } from "@/lib/auth";
import { updateUserName as apiUpdateName, updateUserPassword } from "@/lib/api/auth";
import ProductCard from "@/components/home/ProductCard";
import { FavoriteProduct, getFavorites, subscribeToFavoritesChanges } from "@/lib/favorites";

export default function ProfilePage() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);

  // ویرایش نام
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  // تغییر رمز عبور
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      const data = await getFavorites();
      if (!cancelled) setFavorites(data);
    }

    loadFavorites();

    const unsubscribe = subscribeToFavoritesChanges(() => {
      loadFavorites();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-neutral-400">
        در حال بارگذاری...
      </div>
    );
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  function handleLoginClick() {
    router.push(`/login?redirect=${encodeURIComponent(pathname || "/profile")}`);
  }

  // شروع ویرایش نام
  function startEditingName() {
    if (user) {
      setNewName(user.fullName);
      setEditingName(true);
      setNameError(null);
    }
  }

  // ذخیره نام جدید
  async function saveName() {
    if (!newName.trim() || newName.trim().length < 2) {
      setNameError("نام باید حداقل ۲ حرف باشد.");
      return;
    }
    try {
      const updated = await apiUpdateName(newName.trim());
      updateUserName(updated.full_name);
      setEditingName(false);
      setNameError(null);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "خطا در تغییر نام.");
    }
  }

  // تغییر رمز عبور
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("رمز جدید باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("رمز جدید و تکرار آن یکی نیست.");
      return;
    }

    try {
      await updateUserPassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "خطا در تغییر رمز.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="max-w-md mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center bg-white dark:bg-neutral-900">
        {/* آواتار */}
        <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <User size={36} className="text-neutral-500" />
        </div>

        {/* نام کاربر */}
        {editingName ? (
          <div className="mb-4 space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="relative">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  className="text-center text-lg font-semibold border border-neutral-300 dark:border-neutral-600 rounded-xl px-4 py-2 bg-neutral-50 dark:bg-neutral-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition w-full max-w-[220px]"
                  autoFocus
                />
              </div>
              <button
                onClick={saveName}
                className="p-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-80 transition shadow-sm"
                title="ذخیره"
              >
                <Check size={18} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-red-500 transition shadow-sm"
                title="انصراف"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
            {nameError && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg py-1.5 px-3 inline-block">
                {nameError}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 mb-1 group">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {user ? user.fullName || "بدون نام" : "مهمان"}
            </h1>
            {user && (
              <button
                onClick={startEditingName}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                title="ویرایش نام"
              >
                <Edit3 size={14} />
              </button>
            )}
          </div>
        )}

        {/* شماره تلفن */}
        <div className="flex items-center justify-center gap-2 text-sm text-neutral-500 mb-8">
          <Phone size={14} />
          <span dir="ltr">{user ? user.phone : "وارد نشده‌اید"}</span>
        </div>

        {/* دکمه‌ها */}
        <div className="space-y-3">
          {user ? (
            <>
              {/* تغییر رمز عبور */}
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 py-3 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
              >
                <Lock size={16} />
                {showPasswordForm ? "بستن فرم رمز عبور" : "تغییر رمز عبور"}
              </button>

              {/* فرم تغییر رمز */}
              {showPasswordForm && (
                <form onSubmit={handlePasswordChange} className="text-right space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                  {/* رمز فعلی */}
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="رمز عبور فعلی"
                      required
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 pl-3 pr-10 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition"
                      tabIndex={-1}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* رمز جدید */}
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="رمز عبور جدید"
                      required
                      minLength={6}
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 pl-3 pr-10 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* تکرار رمز جدید */}
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="تکرار رمز عبور جدید"
                      required
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 pl-3 pr-10 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {passwordError && (
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg py-1.5 px-3 text-center">
                      {passwordError}
                    </p>
                  )}
                  {passwordSuccess && (
                    <p className="text-xs text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg py-1.5 px-3 text-center">
                      ✓ رمز عبور با موفقیت تغییر کرد.
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-3 text-sm font-medium hover:opacity-90 transition"
                  >
                    ذخیره رمز جدید
                  </button>
                </form>
              )}

              {/* خروج */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-500 py-3 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              >
                <LogOut size={16} />
                خروج از حساب
              </button>
            </>
          ) : (
            <button
              onClick={handleLoginClick}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 py-3 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
            >
              <LogIn size={16} />
              ورود به حساب کاربری
            </button>
          )}
        </div>
      </div>

      {/* علاقه‌مندی‌ها */}
      {favorites.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-neutral-900 dark:text-white">
            <Heart size={18} className="text-red-500" fill="currentColor" />
            مورد علاقه‌ها
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {favorites.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                price={product.price}
                image={product.image}
                brand={product.brand}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}