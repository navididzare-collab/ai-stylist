"use client";
// force rebuild v2

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/home/ProductCard";
import { getProducts, getImageUrl } from "@/services/api";
import { categories } from "@/lib/categories";

type ProductImage = {
  id: number;
  image_url: string;
  is_main: boolean;
  sort_order: number;
};

type ApiProduct = {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
  is_featured: boolean;
  images: ProductImage[];
};

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? undefined;
  const occasion = searchParams.get("occasion") ?? undefined;
  const featured = searchParams.get("featured") === "true";

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const activeCategory = categories.find(
    (c) =>
      (c.filterType === "category" && c.value === category) ||
      (c.filterType === "occasion" && c.value === occasion)
  );

  useEffect(() => {
    setLoading(true);
    getProducts({ category, occasion })
      .then((data: ApiProduct[]) =>
        setProducts(featured ? data.filter((p) => p.is_featured) : data)
      )
      .finally(() => setLoading(false));
  }, [category, occasion, featured]);

  return (
    <main className="max-w-7xl mx-auto p-6 sm:p-10 min-h-screen bg-white dark:bg-neutral-950 transition-colors">
      {activeCategory?.icon ? (
        <div className="flex justify-center sm:justify-start mb-8 sm:mb-10">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center shrink-0">
            <Image
              src={activeCategory.icon}
              alt={activeCategory.label}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      ) : category || occasion || featured ? (
        <h1 className="text-2xl sm:text-4xl font-bold mb-8 sm:mb-10 text-neutral-900 dark:text-white">
          {featured ? "تخفیف‌های ویژه" : `محصولات: ${category || occasion}`}
        </h1>
      ) : (
        <div className="flex justify-center mb-8 sm:mb-10">
          <Image
            src="/products-icon.png"
            alt="محصولات"
            width={128}
            height={128}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover"
          />
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500 dark:text-neutral-400">در حال بارگذاری...</p>
      ) : products.length === 0 ? (
        <p className="text-neutral-500 dark:text-neutral-400">
          محصولی در این دسته پیدا نشد.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2 sm:gap-3">
          {products.map((product) => {
            const mainImage =
              product.images?.find((img) => img.is_main) ?? product.images?.[0];

            return (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.name}
                brand={product.brand}
                price={`${product.price.toLocaleString()} تومان`}
                image={getImageUrl(mainImage?.image_url)}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsPageContent />
    </Suspense>
  );
}