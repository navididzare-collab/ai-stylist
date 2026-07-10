"use client";

import { useEffect, useState } from "react";
import { User, Phone, LogOut, LogIn, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import AuthModal from "@/components/auth/AuthModal";
import ProductCard from "@/components/home/ProductCard";
import { FavoriteProduct, getFavorites, subscribeToFavoritesChanges } from "@/lib/favorites";

export default function ProfilePage() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
    const unsubscribe = subscribeToFavoritesChanges(() => {
      setFavorites(getFavorites());
    });
    return unsubscribe;
  }, []);

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="max-w-md mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 p-8 text-center">
        <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <User size={36} className="text-neutral-500" />
        </div>

        <h1 className="text-xl font-semibold mb-1">
          {user ? user.fullName : "مهمان"}
        </h1>

        <div className="flex items-center justify-center gap-2 text-sm text-neutral-500 mb-8">
          <Phone size={14} />
          <span dir="ltr">{user ? user.phone : "وارد نشده‌اید"}</span>
        </div>

        {user ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 dark:border-red-900 text-red-500 py-2.5 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition"
          >
            <LogOut size={16} />
            خروج از حساب
          </button>
        ) : (
          <button
            onClick={() => setAuthOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
          >
            <LogIn size={16} />
            ورود به حساب کاربری
          </button>
        )}
      </div>

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

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}