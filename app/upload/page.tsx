"use client";

import { useState } from "react";

export default function UploadPage() {
  const [status, setStatus] = useState("");

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("pdf") as HTMLInputElement;

    if (!input.files?.[0]) {
      setStatus("Selecione um arquivo PDF.");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", input.files[0]);

    setStatus("Processando PDF...");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const data = (await response.json()) as { message: string };
    setStatus(data.message);
  };

  return (
    <main className="page-shell py-10">
      <section className="card mx-auto max-w-2xl p-8">
        <h1 className="text-3xl font-black text-brand-900">Upload de PDF</h1>
        <p className="mt-2 text-brand-900/80">Envie um PDF para gerar flashcards automaticamente.</p>

        <form className="mt-6 space-y-4" onSubmit={handleUpload}>
          <input type="file" accept="application/pdf" name="pdf" className="input" />
          <button type="submit" className="btn btn-primary w-full">
            Gerar flashcards
          </button>
        </form>

        {status && <p className="mt-4 text-sm font-bold text-brand-700">{status}</p>}
      </section>
    </main>
  );
}
