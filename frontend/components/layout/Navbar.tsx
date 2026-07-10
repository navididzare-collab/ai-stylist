"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, User, Search, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/lib/useAuth";
import AuthModal from "@/components/auth/AuthModal";
import { useCart } from "@/context/CartContext";

const navLinks = [
  { href: "/", label: "خانه" },
  { href: "/products", label: "محصولات" },
  { href: "/chat", label: "دستیار استایل" },
  { href: "/profile", label: "پروفایل" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  const { user, isLoggedIn } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const { totalCount } = useCart();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length === 0) return;
    router.push(`/products?search=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors ${
        dark ? "bg-neutral-950 border-neutral-800" : "bg-white border-neutral-200"
      }`}
    >
      {/* ردیف اول: لوگو + جستجو + آیکون‌ها */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center gap-2 sm:gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shrink-0 ${
              dark ? "bg-white" : "bg-neutral-900"
            }`}
          >
            <Image
              src="/logo.png"
              alt="AI Stylist"
              fill
              className="object-cover scale-150"
            />
          </div>
          <span
            className={`hidden lg:block text-xl font-extrabold leading-none ${
              dark ? "text-white" : "text-neutral-900"
            }`}
          >
            AI Stylist
          </span>
        </Link>

        {/* Search - سبک دیجی‌کالا: مستطیل خاکستری ساده، بدون دکمه‌ی جدا */}
        <form
          onSubmit={handleSearch}
          className={`flex-1 min-w-0 flex items-center gap-2 rounded-lg px-3 sm:px-4 h-10 sm:h-11 transition-colors ${
            dark ? "bg-neutral-800" : "bg-neutral-100"
          }`}
        >
          <button
            type="submit"
            aria-label="جستجو"
            className={`flex items-center justify-center shrink-0 ${
              dark ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            <Search size={16} className="sm:hidden" />
            <Search size={18} className="hidden sm:block" />
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو"
            className={`flex-1 min-w-0 w-full bg-transparent text-xs sm:text-sm outline-none ${
              dark ? "text-white placeholder:text-neutral-500" : "text-neutral-900 placeholder:text-neutral-400"
            }`}
          />
        </form>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={toggleTheme}
            aria-label="تغییر پوسته"
            className={`hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
              dark
                ? "border-neutral-700 bg-neutral-900 text-neutral-200 hover:bg-neutral-800"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isLoggedIn ? (
            <Link
              href="/profile"
              className={`flex items-center gap-2 h-9 sm:h-11 px-2.5 sm:px-4 rounded-full border text-xs sm:text-sm font-semibold transition-colors shrink-0 max-w-[140px] ${
                dark
                  ? "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                  : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <User size={16} className="sm:hidden shrink-0" />
              <User size={18} className="hidden sm:block shrink-0" />
              <span className="hidden lg:block truncate">{user?.fullName}</span>
            </Link>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className={`flex items-center gap-2 h-9 sm:h-11 px-2.5 sm:px-4 rounded-full border text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
                dark
                  ? "border-neutral-700 text-neutral-200 hover:bg-neutral-800"
                  : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <User size={16} className="sm:hidden" />
              <User size={18} className="hidden sm:block" />
              <span className="hidden lg:block">ورود</span>
            </button>
          )}

          <Link
            href="/cart"
            className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              dark ? "text-neutral-200 hover:bg-neutral-800" : "text-neutral-700 hover:bg-neutral-100"
            }`}
            aria-label="سبد خرید"
          >
            <ShoppingBag size={18} className="sm:hidden" />
            <ShoppingBag size={20} className="hidden sm:block" />
            {totalCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {totalCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ردیف دوم: منوی لینک‌ها */}
      <div className={`border-t ${dark ? "border-neutral-800" : "border-neutral-100"}`}>
        <div
          className="max-w-7xl mx-auto h-11 flex items-center justify-start gap-5 sm:gap-8 overflow-x-auto"
          style={{ paddingRight: "16px", paddingLeft: "16px" }}
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative h-11 flex items-center text-sm font-medium transition-colors whitespace-nowrap group ${
                  isActive
                    ? dark
                      ? "text-white font-bold"
                      : "text-neutral-900 font-bold"
                    : dark
                    ? "text-neutral-400 hover:text-white"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {link.label}
                <span
                  className={`absolute right-0 left-0 -bottom-px h-0.5 transition-transform origin-center ${
                    dark ? "bg-white" : "bg-neutral-900"
                  } ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
                />
              </Link>
            );
          })}
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}