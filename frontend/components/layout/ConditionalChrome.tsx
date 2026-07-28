"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import AIAssistantBubble from "@/components/AIAssistantBubble";

const HIDDEN_CHROME_ROUTES = ["/login"];

export default function ConditionalChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideChrome = HIDDEN_CHROME_ROUTES.includes(pathname);

  return (
    <>
      {!hideChrome && <Navbar />}
      {children}
      {!hideChrome && <AIAssistantBubble />}
    </>
  );
}