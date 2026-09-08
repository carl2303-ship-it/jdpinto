"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { homePathForRole } from "@/lib/auth-shared";
import type { Collaborator } from "@/types/database";

type Mode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function redirectAfterAuth() {
    const supabase = createClient();
    const { data } = await supabase.rpc("get_my_collaborator");
    const role = (data as Collaborator | null)?.role ?? null;
    router.replace(homePathForRole(role));
    router.refresh();
  }

  async function ensureCollaborator(name: string) {
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("claim_bootstrap_admin", {
      p_full_name: name || "Administrador",
    });

    if (rpcError) {
      if (!rpcError.message.includes("Registo inicial fechado")) {
        console.warn(rpcError.message);
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session) {
          await ensureCollaborator(fullName);
          await redirectAfterAuth();
          return;
        }

        setInfo(
          "Conta criada. Confirma o email (se a confirmação estiver ativa) e depois inicia sessão.",
        );
        setMode("login");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      await ensureCollaborator(fullName || "Administrador");
      await redirectAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "login"
              ? "bg-white text-brand-navy shadow-sm"
              : "text-slate-500"
          }`}
          onClick={() => setMode("login")}
        >
          Entrar
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "register"
              ? "bg-white text-brand-navy shadow-sm"
              : "text-slate-500"
          }`}
          onClick={() => setMode("register")}
        >
          Criar conta
        </button>
      </div>

      {mode === "register" && (
        <Input
          name="fullName"
          placeholder="Nome completo"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      )}

      <Input
        type="email"
        name="email"
        placeholder="Email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        name="password"
        placeholder="Password (mín. 6 caracteres)"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={6}
        required
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-brand-sky-dark">
          {info}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? "Aguarde…"
          : mode === "login"
            ? "Entrar"
            : "Criar primeiro admin"}
      </Button>

      <p className="text-center text-xs text-slate-500">
        {mode === "register"
          ? "A primeira conta torna-se Administrador. Contas seguintes têm de ser criadas por um admin."
          : "Usa o email e password da tua conta Supabase Auth."}
      </p>
    </form>
  );
}
