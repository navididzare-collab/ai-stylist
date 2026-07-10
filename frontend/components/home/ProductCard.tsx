"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { isFavorite, subscribeToFavoritesChanges, toggleFavorite } from "@/lib/favorites";

type ProductCardProps = {
  id: number;
  title: string;
  price: string;
  originalPrice?: string;
  image?: string;
  badge?: string;
  discount?: string;
  brand?: string;
  dark?: boolean;
};

export default function ProductCard({
  id,
  title,
  price,
  originalPrice,
  image,
  badge,
  discount,
  brand,
  dark = false,
}: ProductCardProps) {
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    setFavorite(isFavorite(id));
    const unsubscribe = subscribeToFavoritesChanges(() => {
      setFavorite(isFavorite(id));
    });
    return unsubscribe;
  }, [id]);

  function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite({ id, title, price, image, brand });
  }

  return (
    <Link
      href={`/products/${id}`}
      className={`group flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 ${
        dark
          ? "bg-slate-600/60 border border-slate-500/50 hover:bg-slate-600 dark:bg-white dark:border-neutral-200 dark:hover:bg-neutral-50"
          : "bg-white border border-neutral-100 hover:shadow-md dark:bg-neutral-900 dark:border-neutral-800 dark:hover:shadow-none dark:hover:bg-neutral-800"
      }`}
    >
      {/* IMAGE */}
      <div className="relative overflow-hidden aspect-square w-full bg-white">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={`h-full w-full flex items-center justify-center text-xs ${
              dark
                ? "bg-slate-500/50 text-slate-300 dark:bg-neutral-100 dark:text-neutral-400"
                : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
            }`}
          >
            بدون تصویر
          </div>
        )}

        {discount && (
          <span className="absolute top-2 right-2 rounded-md bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
            {discount}٪
          </span>
        )}

        {badge && !discount && (
          <span
            className={`absolute top-2 right-2 rounded-md px-1.5 py-0.5 text-xs font-bold ${
              dark
                ? "bg-neutral-900 text-white"
                : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            }`}
          >
            {badge}
          </span>
        )}

        <button
          aria-label="افزودن به علاقه‌مندی‌ها"
          onClick={handleFavoriteClick}
          className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full transition-colors shadow-sm ${
            favorite ? "text-red-500" : "text-neutral-400 hover:text-red-500"
          } ${dark ? "bg-white/90" : "bg-white/90 dark:bg-neutral-900/90"}`}
        >
          <Heart size={14} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 flex-col p-2 sm:p-3">
        {brand && (
          <p
            className={`text-[10px] sm:text-xs mb-0.5 sm:mb-1 ${
              dark
                ? "text-slate-400 dark:text-neutral-500"
                : "text-neutral-400 dark:text-neutral-500"
            }`}
          >
            {brand}
          </p>
        )}

        <h3
          className={`text-[11px] sm:text-xs font-medium leading-4 sm:leading-5 line-clamp-1 sm:line-clamp-2 ${
            dark
              ? "text-slate-100 dark:text-neutral-800"
              : "text-neutral-800 dark:text-neutral-200"
          }`}
        >
          {title}
        </h3>

        <div className="mt-1 sm:mt-2">
          {originalPrice && (
            <p
              className={`text-[10px] sm:text-xs line-through mb-0.5 ${
                dark
                  ? "text-slate-500 dark:text-neutral-400"
                  : "text-neutral-400 dark:text-neutral-500"
              }`}
            >
              {originalPrice}
            </p>
          )}
          <p
            className={`text-xs sm:text-sm font-extrabold ${
              dark
                ? "text-white dark:text-neutral-900"
                : "text-neutral-900 dark:text-white"
            }`}
          >
            {price}
          </p>
        </div>
      </div>
    </Link>
  );
}