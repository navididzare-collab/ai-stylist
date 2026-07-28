"use client";

import { useState, FormEvent } from "react";
import { X, User, Phone, Lock } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { loginUser, registerUser } from "@/lib/api/auth";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "login" | "register";

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function resetAndClose() {
    setFullName("");
    setPhone("");
    setPassword("");
    setError(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response =
        mode === "login"
          ? await loginUser(phone, password)
          : await registerUser(fullName, phone, password);

      // دیباگ
      console.log("API RESPONSE:", response);
      console.log("access_token:", response?.access_token);
      console.log("user:", response?.user);

      if (!response?.access_token) {
        throw new Error("توکن دریافت نشد!");
      }

      if (!response?.user) {
        throw new Error("اطلاعات کاربر دریافت نشد!");
      }

      login(
        {
          id: response.user.id,
          fullName: response.user.full_name,
          phone: response.user.phone,
        },
        response.access_token
      );

      console.log("LOGIN SUCCESS - token saved");

      resetAndClose();
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError(err instanceof Error ? err.message : "خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 p-6 relative">
        <button
          onClick={resetAndClose}
          className="absolute top-4 left-4 text-neutral-400 hover:text-neutral-600"
        >
          <X size={20} />
        </button>

        <div className="flex mb-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 text-sm rounded-md transition ${
              mode === "login"
                ? "bg-white dark:bg-neutral-700 font-medium shadow-sm"
                : "text-neutral-500"
            }`}
          >
            ورود
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2 text-sm rounded-md transition ${
              mode === "register"
                ? "bg-white dark:bg-neutral-700 font-medium shadow-sm"
                : "text-neutral-500"
            }`}
          >
            ثبت‌نام
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2.5">
              <User size={16} className="text-neutral-400" />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="نام و نام خانوادگی"
                required
                className="w-full bg-transparent outline-none text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2.5">
            <Phone size={16} className="text-neutral-400" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="شماره موبایل"
              dir="ltr"
              required
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2.5">
            <Lock size={16} className="text-neutral-400" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="رمز عبور"
              type="password"
              required
              minLength={6}
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {loading
              ? "در حال ارسال..."
              : mode === "login"
              ? "ورود"
              : "ایجاد حساب"}
          </button>
        </form>
      </div>
    </div>
  );
}