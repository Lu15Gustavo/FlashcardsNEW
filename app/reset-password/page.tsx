"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

type PageState = "loading" | "ready" | "success" | "error";

export default function ResetPasswordPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [message, setMessage] = useState("Verificando link de redefinição...");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const validateRecoveryLink = async () => {
      try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const authType = params.get("type");
        const tokenHash = params.get("token_hash")?.trim();
        const oauthCode = params.get("code");
        const errorDescription = params.get("error_description")?.trim();
        const errorCode = params.get("error_code")?.trim();

        if (errorCode === "otp_expired") {
          setPageState("error");
          setMessage("Esse link de redefinição expirou. Solicite um novo e-mail.");
          return;
        }

        if (errorDescription) {
          setPageState("error");
          setMessage(decodeURIComponent(errorDescription));
          return;
        }

        if (tokenHash && (authType === "recovery" || params.get("mode") === "reset")) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash
          });

          if (!error) {
            setPageState("ready");
            setMessage("");
            return;
          }

          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            setPageState("ready");
            setMessage("");
            return;
          }

          setPageState("error");
          setMessage("Não foi possível validar o link de redefinição. Solicite um novo e-mail.");
          return;
        }

        if (oauthCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(oauthCode);
          if (!error) {
            setPageState("ready");
            setMessage("");
            return;
          }

          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            setPageState("ready");
            setMessage("");
            return;
          }

          setPageState("error");
          setMessage("Não foi possível validar o link de redefinição. Solicite um novo e-mail.");
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          setPageState("ready");
          setMessage("");
          return;
        }

        setPageState("error");
        setMessage("Link inválido de redefinição. Solicite um novo e-mail.");
      } catch {
        setPageState("error");
        setMessage("Erro ao processar link de redefinição. Tente novamente.");
      }
    };

    void validateRecoveryLink();
  }, []);

  const submitNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    if (newPassword.length < 6) {
      setMessage("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("As senhas não são iguais.");
      return;
    }

    setSubmitting(true);
    setMessage("Atualizando senha...");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setSubmitting(false);
      setMessage(error.message || "Não foi possível atualizar a senha.");
      return;
    }

    setSubmitting(false);
    setPageState("success");
    setMessage("Senha redefinida com sucesso. Agora faça login com sua nova senha.");
  };

  if (pageState === "loading") {
    return (
      <main className="page-shell py-14">
        <section className="mx-auto w-full max-w-lg card p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
            <p className="text-brand-900">{message}</p>
          </div>
        </section>
      </main>
    );
  }

  if (pageState === "error") {
    return (
      <main className="page-shell py-14">
        <section className="mx-auto w-full max-w-lg card p-8">
          <h1 className="text-2xl font-black text-red-600">Erro na Redefinição</h1>
          <p className="mt-3 text-brand-900/80">{message}</p>
          <Link
            href="/auth"
            className="mt-6 inline-flex items-center rounded-lg bg-red-600 px-6 py-3 font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-900/30 active:scale-[0.98]"
          >
            Voltar para Login
          </Link>
        </section>
      </main>
    );
  }

  if (pageState === "success") {
    return (
      <main className="page-shell py-14">
        <section className="mx-auto w-full max-w-lg card p-8">
          <h1 className="text-2xl font-black text-emerald-600">Senha Atualizada!</h1>
          <p className="mt-3 text-brand-900/80">{message}</p>
          <Link
            href="/auth"
            className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 px-6 py-3 font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/30 active:scale-[0.98]"
          >
            Ir para Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell py-14">
      <section className="mx-auto w-full max-w-lg card p-8">
        <h1 className="text-3xl font-black text-brand-900">Redefinir Senha</h1>
        <p className="mt-2 text-brand-900/80">Digite sua nova senha e confirme para finalizar.</p>

        <form onSubmit={submitNewPassword} className="mt-6 space-y-4">
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

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-bold text-brand-800">
              Confirmar nova senha
            </label>
            <input
              id="confirmPassword"
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {message ? <p className="text-sm text-brand-800/90">{message}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand-700 px-6 py-3 text-sm font-black text-white shadow-lg shadow-brand-900/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Atualizando..." : "Salvar nova senha"}
          </button>
        </form>
      </section>
    </main>
  );
}
