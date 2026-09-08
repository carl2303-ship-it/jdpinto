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

export function showSystemNotification(title: string, body: string, url: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const n = new Notification(title, {
      body,
      icon: "/icon.svg",
      tag: `task-${url}`,
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
