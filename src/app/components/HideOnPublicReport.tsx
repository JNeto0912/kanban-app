"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function HideOnPublicReport({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const isPublicReport =
    pathname === "/relatorio" || pathname.startsWith("/relatorio/");

  if (isPublicReport) {
    return null;
  }

  return <>{children}</>;
}