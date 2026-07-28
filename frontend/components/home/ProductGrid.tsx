import Link from "next/link";
import ProductCard from "./ProductCard";
import { getProducts, getImageUrl } from "@/services/api";
import { ArrowLeft } from "lucide-react";

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

function Section({
  title,
  subtitle,
  products,
  dark = false,
  layout = "scroll",
  href,
}: {
  title: string;
  subtitle: string;
  products: ApiProduct[];
  dark?: boolean;
  layout?: "scroll" | "grid";
  href: string;
}) {
  if (products.length === 0) return null;

  return (
    <section
      className={`py-5 transition-colors ${
        dark
          ? "bg-gradient-to-b from-slate-700 to-slate-800 dark:from-amber-50 dark:to-orange-50"
          : "bg-white dark:bg-neutral-950"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {dark && <span className="w-1 h-6 rounded-full bg-red-500 block" />}
            <div>
              <h2
                className={`text-lg font-extrabold ${
                  dark
                    ? "text-white dark:text-neutral-900"
                    : "text-neutral-900 dark:text-white"
                }`}
              >
                {title}
              </h2>
              <p
                className={`text-xs mt-0.5 ${
                  dark
                    ? "text-slate-400 dark:text-neutral-500"
                    : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {subtitle}
              </p>
            </div>
          </div>
          <Link
            href={href}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              dark
                ? "border-slate-500 text-slate-300 hover:bg-slate-600 dark:border-neutral-300 dark:text-neutral-600 dark:hover:bg-neutral-100"
                : "border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            مشاهده همه
            <ArrowLeft size={13} />
          </Link>
        </div>

        {layout === "scroll" ? (
          <div
            className={`flex gap-3 overflow-x-auto pb-3 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full ${
              dark
                ? "[&::-webkit-scrollbar-thumb]:bg-white/40"
                : "[&::-webkit-scrollbar-thumb]:bg-neutral-300"
            }`}
          >
            {products.map((product) => {
              const mainImage =
                product.images.find((img) => img.is_main) ?? product.images[0];

              return (
                <div key={product.id} className="shrink-0 w-28 sm:w-40">
                  <ProductCard
                    id={product.id}
                    title={product.name}
                    brand={product.brand}
                    price={`${product.price.toLocaleString()} تومان`}
                    image={getImageUrl(mainImage?.image_url)}
                    dark={dark}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2 sm:gap-3">
            {products.map((product) => {
              const mainImage =
                product.images.find((img) => img.is_main) ?? product.images[0];

              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.name}
                  brand={product.brand}
                  price={`${product.price.toLocaleString()} تومان`}
                  image={getImageUrl(mainImage?.image_url)}
                  dark={dark}
                />
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}

export default async function ProductGrid() {
  let products: ApiProduct[] = [];

  try {
    products = await getProducts();
  } catch (error) {
    console.error(error);
  }

  if (products.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16 text-center text-neutral-400 dark:text-neutral-600 dark:bg-neutral-950 transition-colors">
        محصولی برای نمایش وجود ندارد.
      </section>
    );
  }

  // "تخفیف‌های ویژه" فقط محصولاتی رو نشون می‌ده که توی ادمین علامت "ویژه" خوردن
  const discountedProducts = products.filter((p) => p.is_featured);
  // "پرفروش‌ترین‌ها" بقیه‌ی محصولات (غیر ویژه) رو نشون می‌ده - فقط ۱۰ تای اول توی صفحه‌ی خانه
  const bestsellerProducts = products.filter((p) => !p.is_featured).slice(0, 10);

  return (
    <div className="space-y-2">
      <Section
        title="تخفیف‌های ویژه"
        subtitle="فقط برای مدت محدود"
        products={discountedProducts}
        dark={true}
        layout="scroll"
        href="/products?featured=true"
      />
      <Section
        title="پرفروش‌ترین‌ها"
        subtitle="انتخاب کاربران"
        products={bestsellerProducts}
        dark={false}
        layout="grid"
        href="/products"
      />
    </div>
  );
}