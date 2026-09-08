import { createClient } from "@/lib/supabase/server";
import type { Collaborator, Team } from "@/types/database";
import { TeamManager } from "./team-manager";

export const metadata = { title: "Equipas" };

export default async function TeamPage() {
  const supabase = await createClient();

  const [collabRes, teamsRes, membersRes] = await Promise.all([
    supabase.from("collaborators").select("*").order("full_name"),
    supabase.from("teams").select("*").order("name"),
    supabase.from("team_members").select("team_id, collaborator_id"),
  ]);

  const error = collabRes.error || teamsRes.error || membersRes.error;
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro ao carregar equipas: {error.message}
      </div>
    );
  }

  const membersByTeam = new Map<string, string[]>();
  for (const row of membersRes.data ?? []) {
    const list = membersByTeam.get(row.team_id) ?? [];
    list.push(row.collaborator_id);
    membersByTeam.set(row.team_id, list);
  }

  const teams = ((teamsRes.data ?? []) as Team[]).map((t) => ({
    ...t,
    member_ids: membersByTeam.get(t.id) ?? [],
  }));

  return (
    <TeamManager
      collaborators={(collabRes.data ?? []) as Collaborator[]}
      teams={teams}
    />
  );
}
