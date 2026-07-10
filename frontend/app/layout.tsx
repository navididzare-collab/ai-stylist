import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { ThemeProvider, ThemeScript } from "@/components/theme/ThemeProvider";
import AIAssistantBubble from "@/components/AIAssistantBubble";
import { CartProvider } from "@/context/CartContext";

export const metadata: Metadata = {
  title: "AI Stylist | فروشگاه هوشمند مد",
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
            <Navbar />
            {children}
            <AIAssistantBubble />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}