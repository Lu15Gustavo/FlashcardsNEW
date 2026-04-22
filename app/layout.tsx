import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FlashcardsNEW",
  description: "Upload de PDF, geração de flashcards e estudo com repetição espaçada"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var theme=localStorage.getItem('flashcardsnew-theme')||'light';document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.dataset.theme=theme;}catch(e){}})();`
          }}
        />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
