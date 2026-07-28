import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, ThemeScript } from "@/components/theme/ThemeProvider";
import { CartProvider } from "@/context/CartContext";
import ConditionalChrome from "@/components/layout/ConditionalChrome";

export const metadata: Metadata = {
  title: "Jest Agent | فروشگاه هوشمند مد",
  description: "فروشگاه آنلاین لباس با پیشنهاد استایل توسط هوش مصنوعی",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-white text-neutral-900 overflow-x-hidden antialiased dark:bg-neutral-950 dark:text-neutral-100 transition-colors">
        <ThemeProvider>
          <CartProvider>
            <ConditionalChrome>{children}</ConditionalChrome>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}