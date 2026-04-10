import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/", label: "Início" },
  { href: "/auth", label: "Login/Cadastro" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/progress", label: "Progresso" }
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-brand-100 bg-white/90 backdrop-blur">
      <nav className="page-shell flex items-center justify-between py-4">
        <Link href="/" className="text-xl font-black text-brand-700">
          FlashcardsNEW
        </Link>

        <div className="flex items-center gap-3">
          <ul className="hidden gap-4 text-sm font-bold text-brand-800 md:flex">
            {links.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="rounded px-3 py-2 hover:bg-brand-50">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
