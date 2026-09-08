import { MessageCircle, Phone, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyCollaborator } from "@/lib/auth";
import {
  ROLE_LABELS,
  type Collaborator,
  type Team,
} from "@/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { telHref, whatsappUrl } from "@/lib/forms";

export const metadata = { title: "Minhas equipas" };

type Member = Pick<
  Collaborator,
  "id" | "full_name" | "phone" | "email" | "role" | "status"
>;

type TeamWithMembers = Team & {
  members: Member[];
  isLeader: boolean;
};

export default async function TechTeamsPage() {
  const supabase = await createClient();
  const me = await getMyCollaborator();

  if (!me) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        A tua conta Auth ainda não está ligada a um colaborador. Pede ao admin
        para criar o teu perfil em Equipas com o teu email e acesso.
      </div>
    );
  }

  const { data: memberships, error: memError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("collaborator_id", me.id);

  if (memError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro: {memError.message}
      </div>
    );
  }

  const teamIds = (memberships ?? []).map((m) => m.team_id);

  if (teamIds.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Header />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <UsersRound className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              Ainda não estás associado a nenhuma equipa.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [{ data: teams, error: teamsError }, { data: allMembers }] =
    await Promise.all([
      supabase.from("teams").select("*").in("id", teamIds).order("name"),
      supabase
        .from("team_members")
        .select("team_id, collaborator_id")
        .in("team_id", teamIds),
    ]);

  if (teamsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Erro: {teamsError.message}
      </div>
    );
  }

  const collaboratorIds = [
    ...new Set((allMembers ?? []).map((m) => m.collaborator_id)),
  ];

  const collabMap = new Map<string, Member>();
  if (collaboratorIds.length > 0) {
    const { data: collaborators } = await supabase
      .from("collaborators")
      .select("id, full_name, phone, email, role, status")
      .in("id", collaboratorIds)
      .eq("status", "active");

    for (const c of collaborators ?? []) {
      collabMap.set(c.id, c as Member);
    }
  }

  const membersByTeam = new Map<string, Member[]>();
  for (const row of allMembers ?? []) {
    const collab = collabMap.get(row.collaborator_id);
    if (!collab) continue;
    const list = membersByTeam.get(row.team_id) ?? [];
    list.push(collab);
    membersByTeam.set(row.team_id, list);
  }

  const teamsView: TeamWithMembers[] = ((teams ?? []) as Team[]).map(
    (team) => ({
      ...team,
      isLeader: team.leader_id === me.id,
      members: (membersByTeam.get(team.id) ?? []).sort((a, b) => {
        if (a.id === team.leader_id) return -1;
        if (b.id === team.leader_id) return 1;
        if (a.id === me.id) return -1;
        if (b.id === me.id) return 1;
        return a.full_name.localeCompare(b.full_name, "pt");
      }),
    }),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Header count={teamsView.length} />

      {teamsView.map((team) => (
        <section key={team.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: team.color_code || "#0ea5e9" }}
              aria-hidden
            />
            <h2 className="text-lg font-semibold text-brand-navy">
              {team.name}
            </h2>
            {team.isLeader && (
              <span className="rounded-full bg-brand-sky/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-sky-dark">
                Líder
              </span>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {team.members.length}{" "}
                {team.members.length === 1 ? "membro" : "membros"}
              </CardTitle>
              <CardDescription>
                Liga ou envia WhatsApp aos colegas da equipa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {team.members.map((member) => {
                const isMe = member.id === me.id;
                const isLeader = member.id === team.leader_id;
                const phone = member.phone?.trim() || "";
                const wa = phone ? whatsappUrl(phone) : null;

                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-brand-navy">
                        {member.full_name}
                        {isMe && (
                          <span className="ml-1.5 text-xs font-normal text-slate-400">
                            (tu)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ROLE_LABELS[member.role]}
                        {isLeader ? " · Líder da equipa" : ""}
                        {phone ? ` · ${phone}` : ""}
                      </p>
                    </div>

                    {!isMe && (
                      <div className="flex flex-wrap gap-2">
                        {phone ? (
                          <>
                            <a
                              href={telHref(phone)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-sky/10 px-3 text-sm font-medium text-brand-sky-dark"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              Ligar
                            </a>
                            {wa && (
                              <a
                                href={wa}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#25D366]/15 px-3 text-sm font-medium text-[#128C7E]"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                WhatsApp
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Sem telefone no perfil
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  );
}

function Header({ count }: { count?: number }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
        Minhas equipas
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {count != null
          ? `${count} ${count === 1 ? "equipa" : "equipas"} · contacta os teus colegas`
          : "Equipas a que pertences"}
      </p>
    </div>
  );
}
