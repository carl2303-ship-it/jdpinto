import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TechTaskAlerts } from "@/components/tech/tech-task-alerts";
import { getMyCollaborator, getSessionUser, isOfficeRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, collaborator] = await Promise.all([
    getSessionUser(),
    getMyCollaborator(),
  ]);

  const techOnly = !isOfficeRole(collaborator?.role);

  let teamIds: string[] = [];
  if (collaborator && techOnly) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("collaborator_id", collaborator.id);
    teamIds = (data ?? []).map((r) => r.team_id);
  }

  return (
    <div className="flex min-h-full bg-app-bg">
      <AppSidebar collaborator={collaborator} email={user?.email} />
      <div className="flex min-h-full min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 py-4 pb-24 lg:px-8 lg:py-6 lg:pb-8">
          {children}
        </main>
        <BottomNav techOnly={techOnly} />
      </div>
      {collaborator && techOnly && (
        <TechTaskAlerts
          collaboratorId={collaborator.id}
          teamIds={teamIds}
        />
      )}
    </div>
  );
}
