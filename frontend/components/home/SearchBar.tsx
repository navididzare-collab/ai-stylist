"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length === 0) return;
    router.push(`/products?search=${encodeURIComponent(query.trim())}`);
  }

  return (
    <section className="w-full flex justify-center pt-8 px-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xl items-center rounded-full border border-neutral-200 bg-neutral-50 px-5 h-12 transition-colors focus-within:border-neutral-400 focus-within:bg-white"
      >
        <Search size={16} className="text-neutral-400 shrink-0" />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="دنبال چه لباسی می‌گردی؟"
          className="flex-1 bg-transparent px-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"
        />

        <button
          type="submit"
          className="rounded-full bg-neutral-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-neutral-700"
        >
          جستجو
        </button>
      </form>
    </section>
  );
}