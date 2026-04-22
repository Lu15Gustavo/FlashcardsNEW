"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Enviar PDF" },
  { href: "/study", label: "FlashCards" }
];

export function WorkspaceTabs() {
  const pathname = usePathname();

  return (
    <nav className="page-shell py-6">
      <div className="inline-flex rounded-2xl border border-brand-100 bg-brand-50 p-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${isActive ? "bg-brand-600 text-white" : "text-brand-800 hover:bg-white/90"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}