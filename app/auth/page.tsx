"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

type Mode = "login" | "signup" | "forgot" | "reset";
type MessageVariant = "info" | "signup-success";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string>("");
  const [messageVariant, setMessageVariant] = useState<MessageVariant>("info");
  const [showSignupSuccessBanner, setShowSignupSuccessBanner] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recoveryRequested = params.get("mode") === "reset" || params.get("type") === "recovery";

    if (recoveryRequested) {
      setMode("reset");
      setMessage("Defina sua nova senha para concluir a recuperação.");
    }
  }, []);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setMessage("");
    setMessageVariant("info");
    setShowSignupSuccessBanner(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("Processando...");
    setMessageVariant("info");

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

      setMode("login");
      setShowSignupSuccessBanner(true);
      setMessage("Cadastro realizado com sucesso. Confirme o e-mail para liberar o acesso.");
      setMessageVariant("signup-success");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    if (mode === "reset") {
      if (newPassword.length < 6) {
        setMessage("A nova senha precisa ter pelo menos 6 caracteres.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Senha atualizada com sucesso. Agora você já pode entrar normalmente.");
      setMode("login");
      setNewPassword("");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`
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
            onClick={() => changeMode("login")}
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
            onClick={() => changeMode("signup")}
            type="button"
          >
            Cadastro
          </button>
        </div>

        {showSignupSuccessBanner ? (
          <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 text-emerald-800">
            <div className="flex items-start gap-3">
              <div className="relative mt-0.5 h-6 w-6 shrink-0">
                <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M7.6 13.4 4.7 10.5a1 1 0 1 0-1.4 1.4l3.6 3.6a1 1 0 0 0 1.4 0l8-8a1 1 0 1 0-1.4-1.4l-7.3 7.3Z" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="text-sm font-black">Cadastro realizado com sucesso.</p>
                <p className="mt-1 text-sm font-semibold">Confirme seu e-mail e depois faça login.</p>
              </div>
            </div>
          </div>
        ) : null}

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

          {mode !== "forgot" && mode !== "reset" && (
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
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => changeMode("forgot")}
                  className="mt-2 inline-flex text-xs font-semibold text-brand-700/85 underline decoration-brand-300 decoration-dotted underline-offset-4 transition hover:text-brand-800"
                >
                  Esqueci minha senha
                </button>
              ) : null}
            </div>
          )}

          {mode === "reset" && (
            <div>
              <label htmlFor="newPassword" className="mb-1 block text-sm font-bold text-brand-800">
                Nova senha
              </label>
              <input
                id="newPassword"
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
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
            {mode === "login"
              ? "Entrar"
              : mode === "signup"
                ? "Criar conta"
                : mode === "reset"
                  ? "Atualizar senha"
                  : "Enviar recuperação"}
          </button>
        </form>

        {message && !showSignupSuccessBanner ? (
          <p className="mt-4 text-sm font-bold text-brand-700">{message}</p>
        ) : null}
      </section>
    </main>
  );
}
