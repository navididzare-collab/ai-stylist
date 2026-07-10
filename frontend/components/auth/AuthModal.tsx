"use client";

import { useState, FormEvent } from "react";
import { X, User, Phone } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (fullName.trim().length < 2) {
      setError("لطفاً نام کامل خود را وارد کنید.");
      return;
    }

    const trimmedPhone = phone.trim();

    if (!/^\d+$/.test(trimmedPhone)) {
      setError("شماره موبایل فقط باید شامل عدد باشد.");
      return;
    }

    if (trimmedPhone.length !== 11) {
      setError("شماره موبایل باید دقیقاً ۱۱ رقم باشد.");
      return;
    }

    if (!trimmedPhone.startsWith("09")) {
      setError("شماره موبایل باید با 09 شروع شود.");
      return;
    }

    login({ fullName: fullName.trim(), phone: trimmedPhone });
    setFullName("");
    setPhone("");
    setError("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          aria-label="بستن"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-1 text-center">ورود به حساب کاربری</h2>
        <p className="text-sm text-neutral-500 text-center mb-6">
          فقط اسم و شماره‌تون رو وارد کنید
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">نام و نام خانوادگی</label>
            <div className="relative">
              <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثلاً سارا احمدی"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent py-2.5 pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">شماره موبایل</label>
            <div className="relative">
              <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => {
                  // فقط عدد قبول می‌شه، هر کاراکتر دیگه‌ای همون لحظه حذف می‌شه
                  const digitsOnly = e.target.value.replace(/\D/g, "");
                  setPhone(digitsOnly.slice(0, 11));
                }}
                onKeyDown={(e) => {
                  const allowedKeys = [
                    "Backspace",
                    "Delete",
                    "ArrowLeft",
                    "ArrowRight",
                    "Tab",
                    "Home",
                    "End",
                  ];
                  if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) return;
                  if (!/^\d$/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                maxLength={11}
                placeholder="09123456789"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent py-2.5 pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                dir="ltr"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-lg bg-black dark:bg-white text-white dark:text-black py-2.5 text-sm font-medium hover:opacity-90 transition"
          >
            ورود
          </button>
        </form>
      </div>
    </div>
  );
}