"use client";

import { useState } from "react";

export default function ProductGallery({
  images,
  alt,
}: {
  images: { id: number; url: string; is_main: boolean }[];
  alt: string;
}) {
  const sorted = [...images];
  const initialIndex = Math.max(
    0,
    sorted.findIndex((img) => img.is_main)
  );
  const [activeIndex, setActiveIndex] = useState(
    initialIndex === -1 ? 0 : initialIndex
  );

  if (sorted.length === 0) {
    return (
      <div className="flex h-72 w-full items-center justify-center bg-neutral-50 text-sm text-neutral-400 dark:bg-neutral-900 dark:text-neutral-600 lg:rounded-2xl lg:h-[420px]">
        بدون تصویر
      </div>
    );
  }

  const active = sorted[activeIndex];

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden bg-neutral-50 dark:bg-neutral-900 lg:rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.url}
          alt={alt}
          className="h-72 w-full object-contain sm:h-96 lg:h-[420px]"
        />
      </div>

      {sorted.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 lg:px-0">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === activeIndex
                  ? "border-neutral-900 dark:border-white"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}