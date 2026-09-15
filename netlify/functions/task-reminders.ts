import type { Config } from "@netlify/functions";
import { runScheduledTaskReminders } from "../../src/lib/task-reminders";

/** Cron: avisos 10/30 min antes da marcação (push). */
export default async () => {
  try {
    const result = await runScheduledTaskReminders();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  schedule: "*/5 * * * *",
};
