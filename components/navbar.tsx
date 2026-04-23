import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { FlashcardsNavLink } from "@/components/flashcards-nav-link";

const links = [
  { href: "/", label: "Início" },
  { href: "/auth", label: "Login/Cadastro" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Enviar PDF" },
  { href: "/decks", label: "Decks" }
];

export async function Navbar() {
  const visibleLinks = links;

  return (
    <header className="sticky top-0 z-10 border-b border-brand-100 bg-white/90 backdrop-blur">
      <nav className="page-shell flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-black text-brand-700">
          <span className="relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-brand-100 bg-white/90 p-1 shadow-xl">
            <Image
              src="/logo-avatar.png"
              alt="Logo FlashCardsNews"
              width={44}
              height={44}
              className="rounded-full object-cover"
              priority
            />
          </span>
          <span>FlashCardsNews</span>
        </Link>

        <div className="flex items-center gap-3">
          <ul className="hidden gap-4 text-sm font-bold text-brand-800 md:flex">
            {visibleLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="rounded px-3 py-2 hover:bg-brand-50">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <FlashcardsNavLink />
            </li>
          </ul>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
