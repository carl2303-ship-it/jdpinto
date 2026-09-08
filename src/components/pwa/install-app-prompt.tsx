"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "jdpinto-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isMobile() {
  if (typeof window === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (isStandalone() || !isMobile()) return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;

    setIos(isIos());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    // iOS não tem beforeinstallprompt — mostrar instruções
    const t = window.setTimeout(() => {
      if (isIos()) setVisible(true);
    }, 1200);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(t);
    };
  }, []);

  // Android: se o evento chegar mais tarde, já temos visible
  useEffect(() => {
    if (deferred && !isStandalone() && isMobile()) {
      if (localStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    }
  }, [deferred]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") {
      localStorage.setItem(STORAGE_KEY, "1");
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/icon-192.png"
              alt="JDPINTO"
              width={56}
              height={56}
              className="rounded-xl border border-slate-200 shadow-sm"
              priority
            />
            <div>
              <h2
                id="install-title"
                className="text-base font-semibold text-brand-navy"
              >
                Instalar JDPINTO
              </h2>
              <p className="text-xs text-slate-500">
                Acede mais rápido a partir do ecrã inicial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {ios ? (
            <ol className="space-y-2 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="font-semibold text-brand-sky-dark">1.</span>
                <span>
                  Toca em{" "}
                  <Share className="inline h-3.5 w-3.5 text-brand-sky-dark" />{" "}
                  <strong>Partilhar</strong> (Safari)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-sky-dark">2.</span>
                <span>
                  Escolhe <strong>Adicionar ao ecrã inicial</strong>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-brand-sky-dark">3.</span>
                <span>
                  Confirma <strong>Adicionar</strong>
                </span>
              </li>
            </ol>
          ) : (
            <p className="text-sm text-slate-600">
              Instala a app no telemóvel para receber alertas e abrir as tuas
              intervenções como uma aplicação.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {!ios && deferred && (
              <Button type="button" className="w-full" onClick={install}>
                <Download className="h-4 w-4" />
                Adicionar à app
              </Button>
            )}
            <Button
              type="button"
              variant={ios || !deferred ? "default" : "secondary"}
              className="w-full"
              onClick={dismiss}
            >
              {ios ? "Entendi" : deferred ? "Agora não" : "Fechar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
