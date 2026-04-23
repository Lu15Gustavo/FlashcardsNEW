"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

export function FlashcardsNavLink() {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign("/study");
  };

  return (
    <Link href="/study" onClick={handleClick} className="rounded px-3 py-2 hover:bg-brand-50">
      FlashCards
    </Link>
  );
}