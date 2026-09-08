import { redirect } from "next/navigation";
import { getMyCollaborator, homePathForRole } from "@/lib/auth";

export default async function HomePage() {
  const me = await getMyCollaborator();
  redirect(homePathForRole(me?.role));
}
