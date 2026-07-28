import { notFound } from "next/navigation";
import { getProduct, getImageUrl } from "@/services/api";
import ProductGallery from "@/components/product/ProductGallery";
import TryOnTrigger from "@/components/tryon/TryOnTrigger";
import StyleMatchTrigger from "@/components/StyleMatchTrigger";
import AddToCartButton from "@/components/product/AddToCartButton";

type ProductImage = {
  id: number;
  image_url: string;
  is_main: boolean;
  sort_order: number;
};

type Product = {
  id: number;
  name: string;
  brand: string;
  category: string;
  color: string;
  size: string;
  material: string;
  gender: string;
  season: string;
  occasion: string;
  price: number;
  stock: number;
  is_active: boolean;
  images: ProductImage[];
};

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2.5 text-center dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product: Product | null = await getProduct(id);

  if (!product) {
    notFound();
  }

  const images = product.images
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({
      id: img.id,
      url: getImageUrl(img.image_url) ?? "",
      is_main: img.is_main,
    }));

  const inStock = product.stock > 0;
  const mainImage = images.find((img) => img.is_main) ?? images[0];

  return (
    <main className="min-h-screen bg-white transition-colors dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl lg:px-6 lg:py-8">
        {/* breadcrumb */}
        <p className="hidden px-4 pt-4 text-xs text-neutral-400 dark:text-neutral-500 lg:block lg:px-0 lg:pt-0 lg:mb-6">
          محصولات <span className="mx-1">/</span> {product.category}{" "}
          <span className="mx-1">/</span> {product.brand}
        </p>

        <div className="flex flex-col lg:flex-row lg:gap-12">
          {/* Gallery — full-bleed on mobile, right column on desktop */}
          <div className="lg:w-1/2 lg:shrink-0">
            <ProductGallery images={images} alt={product.name} />

            <div className="px-4 pt-3 lg:px-0 flex flex-col gap-2">
              <TryOnTrigger productId={product.id} productTitle={product.name} />
              <StyleMatchTrigger productId={product.id} />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 px-4 pb-8 pt-4 lg:px-0 lg:pt-0">
            <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
              {product.brand}
            </p>
            <h1 className="mt-0.5 text-xl font-extrabold text-neutral-900 dark:text-white sm:text-2xl lg:text-3xl">
              {product.name}
            </h1>

            <div className="mt-2.5 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  inStock ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {inStock ? `موجود (${product.stock} عدد)` : "ناموجود"}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-xl font-extrabold text-neutral-900 dark:text-white sm:text-2xl">
                {product.price.toLocaleString()} تومان
              </p>

              <AddToCartButton
                id={product.id}
                name={product.name}
                price={product.price}
                image={mainImage?.url}
                stock={product.stock}
              />
            </div>

            <div className="mt-5">
              <h2 className="mb-2.5 text-sm font-bold text-neutral-900 dark:text-white">
                ویژگی‌ها
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <Spec label="رنگ" value={product.color} />
                <Spec label="سایز" value={product.size} />
                <Spec label="جنس" value={product.material} />
                <Spec label="جنسیت" value={product.gender} />
                <Spec label="فصل" value={product.season} />
                <Spec label="مناسبت" value={product.occasion} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}