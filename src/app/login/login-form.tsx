"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { homePathForRole } from "@/lib/auth-shared";
import type { Collaborator } from "@/types/database";
import { cn } from "@/lib/utils";

type Mode = "login" | "register" | "forgot";

function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder,
  required,
  minLength,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        name="password"
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={minLength}
        required={required}
        className="pr-11"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-brand-navy"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar password" : "Mostrar password"}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

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
      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
          },
        );

        if (resetError) {
          setError(resetError.message);
          return;
        }

        setInfo(
          "Se existir uma conta com este email, enviámos um link para redefinir a password. Verifica a caixa de entrada e o spam.",
        );
        return;
      }

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
      {mode !== "forgot" && (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mode === "login"
                ? "bg-white text-brand-navy shadow-sm"
                : "text-slate-500",
            )}
            onClick={() => {
              setMode("login");
              setError(null);
              setInfo(null);
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mode === "register"
                ? "bg-white text-brand-navy shadow-sm"
                : "text-slate-500",
            )}
            onClick={() => {
              setMode("register");
              setError(null);
              setInfo(null);
            }}
          >
            Criar conta
          </button>
        </div>
      )}

      {mode === "forgot" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Indica o teu email e enviaremos um link para criares uma nova password.
        </div>
      )}

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

      {mode !== "forgot" && (
        <PasswordInput
          value={password}
          onChange={setPassword}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="Password (mín. 6 caracteres)"
          minLength={6}
          required
        />
      )}

      {mode === "login" && (
        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs font-medium text-brand-sky-dark hover:underline"
            onClick={() => {
              setMode("forgot");
              setError(null);
              setInfo(null);
              setPassword("");
            }}
          >
            Esqueci a password
          </button>
        </div>
      )}

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
            : mode === "forgot"
              ? "Enviar link de recuperação"
              : "Criar primeiro admin"}
      </Button>

      {mode === "forgot" ? (
        <button
          type="button"
          className="w-full text-center text-xs font-medium text-brand-sky-dark hover:underline"
          onClick={() => {
            setMode("login");
            setError(null);
            setInfo(null);
          }}
        >
          Voltar ao login
        </button>
      ) : (
        <p className="text-center text-xs text-slate-500">
          {mode === "register"
            ? "A primeira conta torna-se Administrador. Contas seguintes têm de ser criadas por um admin."
            : "Usa o email e a password da tua conta."}
        </p>
      )}
    </form>
  );
}
