"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase-client";

type Mode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string>("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Processando...");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Login realizado com sucesso. Redirecionando...");
      window.location.assign("/upload");
      return;
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setMessage("A confirmação de senha não confere.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth?mode=login`
        }
      });
      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        setMessage("Cadastro realizado com sucesso. Redirecionando...");
        window.location.assign("/upload");
        return;
      }

      setMessage("Cadastro enviado. Confira seu e-mail para confirmar e depois faça login.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`
    });
    setMessage(error ? error.message : "E-mail de recuperação enviado.");
  };

  return (
    <main className="page-shell py-14">
      <section className="mx-auto w-full max-w-xl card p-8">
        <h1 className="text-3xl font-black text-brand-900">Acesse sua conta</h1>
        <p className="mt-2 text-brand-900/80">Login, cadastro e recuperação de senha.</p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className={`rounded-xl border px-4 py-2 text-sm font-black transition-all duration-200 active:scale-[0.98] ${
              mode === "login"
                ? "border-brand-500 bg-brand-600 text-white shadow-lg shadow-brand-900/30"
                : "border-brand-300 bg-brand-950/35 text-brand-100 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-900/45"
            }`}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={`rounded-xl border px-4 py-2 text-sm font-black transition-all duration-200 active:scale-[0.98] ${
              mode === "signup"
                ? "border-brand-500 bg-brand-600 text-white shadow-lg shadow-brand-900/30"
                : "border-brand-300 bg-brand-950/35 text-brand-100 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-900/45"
            }`}
            onClick={() => setMode("signup")}
            type="button"
          >
            Cadastro
          </button>
          <button
            className={`rounded-xl border px-4 py-2 text-sm font-black transition-all duration-200 active:scale-[0.98] ${
              mode === "forgot"
                ? "border-brand-500 bg-brand-600 text-white shadow-lg shadow-brand-900/30"
                : "border-brand-300 bg-brand-950/35 text-brand-100 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-900/45"
            }`}
            onClick={() => setMode("forgot")}
            type="button"
          >
            Esqueci minha senha
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-bold text-brand-800">
                Nome
              </label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-bold text-brand-800">
              E-mail
            </label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-bold text-brand-800">
                Senha
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-bold text-brand-800">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 font-black text-white shadow-lg shadow-brand-950/25 transition-all duration-200 hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-600 active:scale-[0.99]"
          >
            {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar recuperação"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm font-bold text-brand-700">{message}</p>}
      </section>
    </main>
  );
}
