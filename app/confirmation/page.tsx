"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { mapAuthErrorMessage } from "@/lib/auth-errors";

type ConfirmationType = "signup" | "error";

export default function ConfirmationPage() {
  const [confirmationType, setConfirmationType] = useState<ConfirmationType>("signup");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saveProfileData = async (user: any) => {
      try {
        // Tentar pegar o nome do metadata do usuário (enviado no signup)
        const userName = user?.user_metadata?.name ?? "";
        const userEmail = user?.email ?? "";

        if (userName || userEmail) {
          await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: userName,
              email: userEmail
            })
          });
        }
      } catch {
        // Falha silenciosa - não deve bloquear a confirmação
      }
    };

    const processConfirmation = async () => {
      try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const authType = params.get("type");
        const tokenHash = params.get("token_hash")?.trim();
        const oauthCode = params.get("code");
        const errorDescription = params.get("error_description")?.trim();
        const errorCode = params.get("error_code")?.trim();
        const recoveryRequested = params.get("mode") === "reset" || authType === "recovery";
        const signupConfirmed = authType === "signup";

        if (recoveryRequested) {
          window.location.assign("/reset-password" + url.search);
          return;
        }

        // Processar token_hash (verifyOtp)
        if (tokenHash && signupConfirmed) {
          const { error, data } = await supabase.auth.verifyOtp({
            type: "signup",
            token_hash: tokenHash
          });

          if (!error) {
            // Salvar dados do profile se for signup
            if (signupConfirmed && data?.user) {
              await saveProfileData(data.user);
            }
            setConfirmationType("signup");
            setIsLoading(false);
            return;
          }

          // Fallback: verificar se session existe
          const { data: tokenSession } = await supabase.auth.getSession();
          if (tokenSession.session && signupConfirmed && tokenSession.session.user) {
            await saveProfileData(tokenSession.session.user);
            setConfirmationType("signup");
            setIsLoading(false);
            return;
          }
        }

        // Processar oauth code
        if (oauthCode) {
          const { error, data } = await supabase.auth.exchangeCodeForSession(oauthCode);
          if (!error) {
            // Salvar dados do profile se for signup
            if (signupConfirmed && data?.user) {
              await saveProfileData(data.user);
            }
            setConfirmationType("signup");
            setIsLoading(false);
            return;
          }

          // Fallback: verificar se session existe
          const { data: codeSession } = await supabase.auth.getSession();
          if (codeSession.session && signupConfirmed && codeSession.session.user) {
            await saveProfileData(codeSession.session.user);
            setConfirmationType("signup");
            setIsLoading(false);
            return;
          }
        }

        // Processar erros
        if (errorCode === "otp_expired") {
          setConfirmationType("error");
          setErrorMessage(mapAuthErrorMessage(errorCode, "confirmation"));
          setIsLoading(false);
          return;
        }

        if (errorDescription) {
          setConfirmationType("error");
          setErrorMessage(mapAuthErrorMessage(errorDescription, "confirmation"));
          setIsLoading(false);
          return;
        }

        // Se chegou aqui sem processar nada, é sucesso (URL sem params)
        setConfirmationType("signup");
        setIsLoading(false);
      } catch {
        setConfirmationType("error");
        setErrorMessage(mapAuthErrorMessage("confirmation error", "confirmation"));
        setIsLoading(false);
      }
    };

    void processConfirmation();
  }, []);

  if (isLoading) {
    return (
      <main className="page-shell py-14">
        <section className="mx-auto w-full max-w-lg card p-8">
          <div className="flex items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
            <p className="text-brand-900">Processando sua confirmação...</p>
          </div>
        </section>
      </main>
    );
  }

  if (confirmationType === "error") {
    return (
      <main className="page-shell py-14">
        <section className="mx-auto w-full max-w-lg card p-8">
          <div className="flex items-start gap-4">
            <div className="relative h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M4.47 4.47a.75.75 0 0 1 1.06 0L10 8.94l4.47-4.47a.75.75 0 1 1 1.06 1.06L11.06 10l4.47 4.47a.75.75 0 1 1-1.06 1.06L10 11.06l-4.47 4.47a.75.75 0 0 1-1.06-1.06L8.94 10 4.47 5.53a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-red-600">Erro na Confirmação</h1>
              <p className="mt-2 text-brand-900/80">{errorMessage}</p>
              <Link
                href="/auth"
                className="mt-6 inline-flex items-center rounded-lg bg-red-600 px-6 py-3 font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-900/30 active:scale-[0.98]"
              >
                Voltar para Login
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // Sucesso - signup confirmado
  return (
    <main className="page-shell py-14">
      <section className="mx-auto w-full max-w-lg card p-8">
        <div className="flex items-start gap-4">
          <div className="relative h-12 w-12 shrink-0">
            <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
              <svg viewBox="0 0 20 20" className="h-6 w-6 fill-current" aria-hidden="true">
                <path d="M7.6 13.4 4.7 10.5a1 1 0 1 0-1.4 1.4l3.6 3.6a1 1 0 0 0 1.4 0l8-8a1 1 0 1 0-1.4-1.4l-7.3 7.3Z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-emerald-600">Confirmação Bem-Sucedida!</h1>
            <p className="mt-2 text-base text-brand-900/80">Seu e-mail foi confirmado com sucesso. Agora você pode fazer login e começar a usar sua conta.</p>
            <Link
              href="/auth?mode=login"
              className="mt-6 inline-flex items-center rounded-lg bg-emerald-600 px-6 py-3 font-black text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/30 active:scale-[0.98]"
            >
              Fazer Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
