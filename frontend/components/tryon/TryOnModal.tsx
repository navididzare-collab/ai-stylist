"use client";

import { useRef, useState } from "react";
import { X, Upload, Download } from "lucide-react";
import { tryOnProduct } from "@/services/tryon";

interface TryOnModalProps {
  productId: number;
  productTitle: string;
  onClose: () => void;
}

export default function TryOnModal({ productId, productTitle, onClose }: TryOnModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError(null);
  }

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const url = await tryOnProduct(productId, file);
      setResultUrl(url);
    } catch (err) {
      console.error(err);
      setError("مشکلی پیش اومد. دوباره امتحان کن.");
    }

    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-neutral-700/50 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="بستن"
          className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors z-10"
        >
          <X size={16} />
        </button>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              امتحان روی تنت ✨
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {productTitle}
            </p>
          </div>

          {!resultUrl && (
            <>
              <div
                onClick={() => inputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors overflow-hidden ${
                  preview ? "" : "h-56"
                }`}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="پیش‌نمایش"
                    className="max-h-[60vh] w-full object-contain"
                  />
                ) : (
                  <>
                    <Upload size={22} className="text-neutral-400" />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      برای آپلود عکس تمام‌قدت کلیک کن
                    </p>
                  </>
                )}
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={!file || loading}
                className="flex items-center justify-center gap-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {loading ? "در حال ساخت تصویر..." : "بزن بریم"}
              </button>

              {loading && (
                <p className="text-xs text-center text-neutral-400 dark:text-neutral-500">
                  ممکنه چند ثانیه طول بکشه...
                </p>
              )}
            </>
          )}

          {resultUrl && (
            <>
              <div className="rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultUrl} alt="نتیجه" className="w-full object-contain" />
              </div>

              <div className="flex gap-2">
                <a
                  href={resultUrl}
                  download
                  className="flex-1 flex items-center justify-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-700 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                >
                  <Download size={15} />
                  دانلود
                </a>
                <button
                  onClick={() => {
                    setResultUrl(null);
                    setFile(null);
                    setPreview(null);
                  }}
                  className="flex-1 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 py-2.5 text-sm font-semibold"
                >
                  امتحان دوباره
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}