"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase-client";

type Mode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Processando...");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setMessage(error ? error.message : "Login realizado com sucesso.");
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });
      setMessage(error ? error.message : "Cadastro enviado. Confira seu e-mail para confirmar.");
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
          <button className="btn btn-secondary" onClick={() => setMode("login")} type="button">
            Login
          </button>
          <button className="btn btn-secondary" onClick={() => setMode("signup")} type="button">
            Cadastro
          </button>
          <button className="btn btn-secondary" onClick={() => setMode("forgot")} type="button">
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

          <button type="submit" className="btn btn-primary w-full">
            {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar recuperação"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm font-bold text-brand-700">{message}</p>}
      </section>
    </main>
  );
}
