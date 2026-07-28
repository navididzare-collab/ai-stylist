import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function Hero() {
  return (
    <section className="border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-8 lg:px-16 py-24 lg:py-36">
        <div className="grid lg:grid-cols-2 gap-20 items-center">

          {/* متن سمت راست */}
          <div className="lg:pr-6">
            <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-5 py-2 text-sm text-neutral-600">
              استایل با هوش مصنوعی
            </span>

            <h1 className="mt-10 text-4xl lg:text-6xl font-extrabold text-neutral-900 leading-[1.35]">
              لباسی که
              <br />
              مال خودته.
            </h1>

            <p className="mt-8 max-w-md text-lg text-neutral-500 leading-8">
              با تحلیل سلیقه، رنگ و استایل تو، هوش مصنوعی بهترین لباس‌ها
              را از بین محصولات فروشگاه پیشنهاد می‌دهد.
            </p>

            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-9 py-4 rounded-full bg-neutral-900 text-white font-bold hover:bg-neutral-700 transition-colors"
              >
                شروع خرید
                <ArrowLeft size={18} />
              </Link>

              <Link
                href="/chat"
                className="inline-flex items-center px-9 py-4 rounded-full border border-neutral-300 text-neutral-900 font-bold hover:bg-neutral-50 transition-colors"
              >
                مشاوره با هوش مصنوعی
              </Link>
            </div>
          </div>

          {/* کارت سمت چپ */}
          <div className="flex justify-start lg:pl-6">
            <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="h-80 bg-neutral-100" />

              <div className="p-7">
                <p className="text-sm text-neutral-400">پیشنهاد امروز</p>
                <p className="mt-2 text-lg font-bold text-neutral-900">
                  هودی Oversize Premium
                </p>

                <div className="mt-7 flex items-center justify-between">
                  <p className="text-xl font-extrabold text-neutral-900">
                    ۷۹۹٬۰۰۰ تومان
                  </p>

                  <span className="w-11 h-11 rounded-full bg-neutral-900 flex items-center justify-center text-white">
                    <ArrowLeft size={18} />
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}