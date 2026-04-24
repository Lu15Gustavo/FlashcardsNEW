"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-client";

type UserMenuProps = {
  email: string;
};

function getInitial(email: string) {
  const normalized = email.trim();
  return normalized ? normalized[0].toUpperCase() : "U";
}

export function UserMenu({ email }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const userInitial = useMemo(() => getInitial(email), [email]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) {
        return;
      }

      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.assign("/auth");
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-300/35 bg-brand-700/25 text-sm font-black text-brand-100 shadow-[0_8px_20px_rgba(31,17,56,0.28)] transition hover:border-brand-300/55 hover:bg-brand-700/35"
        aria-label="Abrir menu do usuário"
      >
        {userInitial}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-20 w-56 rounded-2xl border border-brand-300/30 bg-brand-900/85 p-2 shadow-xl backdrop-blur">
          <p className="px-3 py-2 text-xs font-bold text-brand-100/85">{email}</p>

          <Link
            href="/checkout"
            className="block rounded-xl border border-transparent px-3 py-2 text-sm font-bold text-white/90 transition hover:border-brand-300/30 hover:bg-brand-700/30"
            onClick={() => setOpen(false)}
          >
            Assinaturas
          </Link>

          <Link
            href="/profile"
            className="block rounded-xl border border-transparent px-3 py-2 text-sm font-bold text-white/90 transition hover:border-brand-300/30 hover:bg-brand-700/30"
            onClick={() => setOpen(false)}
          >
            Editar perfil
          </Link>

          <button
            type="button"
            className="mt-1 w-full rounded-xl border border-transparent px-3 py-2 text-left text-sm font-bold text-white/90 transition hover:border-brand-300/30 hover:bg-brand-700/30 disabled:opacity-60"
            onClick={logout}
            disabled={loading}
          >
            {loading ? "Saindo..." : "Logout"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
