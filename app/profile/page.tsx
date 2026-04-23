"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

type ProfileRow = {
  email: string | null;
  name: string | null;
  plan: string | null;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("basic");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.assign("/auth");
        return;
      }

      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("email, name, plan")
        .eq("id", user.id)
        .single<ProfileRow>();

      if (data) {
        setEmail(data.email ?? user.email ?? "");
        setName(data.name ?? "");
        setPlan(data.plan ?? "basic");
      }

      setLoading(false);
    };

    void load();
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
      });

      const data = (await response.json()) as { message?: string };
      setMessage(data.message ?? (response.ok ? "Perfil atualizado com sucesso." : "Erro ao atualizar perfil."));
    } catch {
      setMessage("Erro ao atualizar perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="page-shell py-10">
        <section className="card p-8">
          <p className="text-brand-900/80">Carregando perfil...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell py-10">
      <section className="card mx-auto max-w-2xl p-8">
        <h1 className="text-3xl font-black text-brand-900">Editar perfil</h1>
        <p className="mt-2 text-brand-900/80">Atualize seus dados pessoais.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm font-bold text-brand-700" htmlFor="profile-email">
              E-mail
            </label>
            <input id="profile-email" className="input" value={email} disabled />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-brand-700" htmlFor="profile-name">
              Nome
            </label>
            <input
              id="profile-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-brand-700" htmlFor="profile-plan">
              Plano
            </label>
            <input id="profile-plan" className="input" value={plan} disabled />
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar perfil"}
          </button>
        </form>

        {message ? <p className="mt-4 text-sm font-bold text-brand-700">{message}</p> : null}
      </section>
    </main>
  );
}
