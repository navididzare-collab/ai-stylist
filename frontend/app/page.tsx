export const dynamic = "force-dynamic";

import Categories from "@/components/home/Categories";
import ProductGrid from "@/components/home/ProductGrid";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors">
      <Categories />
      <ProductGrid />
    </main>
  );
}