/**
 * Alerta sonoro prolongado (Web Audio) — ~4.5s, padrão tipo alarme
 * para novas tarefas atribuídas. Não precisa de ficheiro.
 */
export function playTaskAlertSound() {
  if (typeof window === "undefined") return;

  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();

    const tone = (
      freq: number,
      start: number,
      duration: number,
      volume = 0.28,
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.03);
    };

    // 3 rajadas (cada uma: 3 tons ascendentes) com pausas — ~4.5s
    const burst = (offset: number) => {
      tone(740, offset, 0.22, 0.22);
      tone(988, offset + 0.26, 0.22, 0.26);
      tone(1175, offset + 0.52, 0.35, 0.3);
    };

    burst(0);
    burst(1.4);
    burst(2.8);
    // tom final mais longo
    tone(1319, 4.1, 0.55, 0.32);

    void ctx.resume();
  } catch {
    // Silencioso se o browser bloquear áudio
  }
}

export async function ensureNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied" as NotificationPermission | "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function ensureServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** Subscreve Web Push e grava no Supabase (alertas com app em 2.º plano). */
export async function subscribePushNotifications(collaboratorId: string) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { ok: false as const, error: "VAPID em falta" };

  const permission = await ensureNotificationPermission();
  if (permission !== "granted") {
    return { ok: false as const, error: "Permissão de notificações recusada" };
  }

  const reg = await ensureServiceWorker();
  if (!reg?.pushManager) {
    return { ok: false as const, error: "Push não suportado neste dispositivo" };
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false as const, error: "Subscrição inválida" };
  }

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      collaborator_id: collaboratorId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function showSystemNotification(
  title: string,
  body: string,
  url: string,
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const tag = `task-${url}`;

  try {
    const reg = await ensureServiceWorker();
    if (reg?.active || reg?.showNotification) {
      // Preferir SW: funciona melhor com o ecrã bloqueado / app em 2.º plano
      await reg.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag,
        requireInteraction: true,
        data: { url },
      } as NotificationOptions);
      return;
    }
  } catch {
    // fallback abaixo
  }

  try {
    const n = new Notification(title, {
      body,
      icon: "/icon-192.png",
      tag,
      requireInteraction: true,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = url;
      n.close();
    };
  } catch {
    // ignore
  }
}

/** Avisa a lista do técnico para recarregar. */
export function broadcastTasksChanged(taskId?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("jdpinto:tasks-changed", { detail: { taskId } }),
  );
}
