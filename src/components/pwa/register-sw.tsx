"use client";

import { useEffect } from "react";
import { ensureServiceWorker } from "@/lib/task-alert";

/** Regista o service worker para notificações push. */
export function RegisterServiceWorker() {
  useEffect(() => {
    void ensureServiceWorker();
  }, []);
  return null;
}
