import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/types/database";
import { ClientsManager } from "./clients-manager";

export const metadata = { title: "Clientes" };

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar clientes: {error.message}
      </div>
    );
  }

  return <ClientsManager clients={(data ?? []) as Client[]} />;
}
