"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Collaborator, Team } from "@/types/database";
import { ROLE_LABELS } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteCollaborator,
  deleteTeam,
  upsertCollaborator,
  upsertTeam,
  type ActionResult,
} from "./actions";

const initial: ActionResult | null = null;

type TeamWithMembers = Team & { member_ids: string[] };

type Props = {
  collaborators: Collaborator[];
  teams: TeamWithMembers[];
};

export function TeamManager({ collaborators, teams }: Props) {
  const router = useRouter();
  const [collabOpen, setCollabOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);
  const [editingTeam, setEditingTeam] = useState<TeamWithMembers | null>(null);

  const [collabState, collabAction, collabPending] = useActionState(
    upsertCollaborator,
    initial,
  );
  const [teamState, teamAction, teamPending] = useActionState(
    upsertTeam,
    initial,
  );

  useEffect(() => {
    if (collabState?.ok) {
      const t = window.setTimeout(() => {
        setCollabOpen(false);
        setEditingCollab(null);
        router.refresh();
      }, collabState.message ? 1800 : 0);
      return () => window.clearTimeout(t);
    }
  }, [collabState, router]);

  useEffect(() => {
    if (teamState?.ok) {
      setTeamOpen(false);
      setEditingTeam(null);
      router.refresh();
    }
  }, [teamState, router]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            Colaboradores & Equipas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Perfis de acesso, responsáveis e membros.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setEditingCollab(null);
              setCollabOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Colaborador
          </Button>
          <Button
            type="button"
            onClick={() => {
              setEditingTeam(null);
              setTeamOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Equipa
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Colaboradores</CardTitle>
            <CardDescription>{collaborators.length} registo(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {collaborators.length === 0 ? (
              <p className="text-sm text-slate-500">Sem colaboradores.</p>
            ) : (
              collaborators.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-brand-navy">{c.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {ROLE_LABELS[c.role]} · {c.status}
                      {c.email ? ` · ${c.email}` : ""}
                      {c.user_id ? " · acesso OK" : " · sem login"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingCollab(c);
                        setCollabOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm("Eliminar colaborador?")) return;
                        const r = await deleteCollaborator(c.id);
                        if (!r.ok) alert(r.error);
                        else router.refresh();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipas</CardTitle>
            <CardDescription>{teams.length} equipa(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {teams.length === 0 ? (
              <p className="text-sm text-slate-500">Sem equipas.</p>
            ) : (
              teams.map((t) => {
                const leader = collaborators.find((c) => c.id === t.leader_id);
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: t.color_code }}
                        />
                        <p className="font-medium text-brand-navy">{t.name}</p>
                      </div>
                      <p className="text-xs text-slate-500">
                        Líder: {leader?.full_name ?? "—"} ·{" "}
                        {t.member_ids.length} membro(s)
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingTeam(t);
                          setTeamOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm("Eliminar equipa?")) return;
                          const r = await deleteTeam(t.id);
                          if (!r.ok) alert(r.error);
                          else router.refresh();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={collabOpen}
        onClose={() => setCollabOpen(false)}
        title={editingCollab ? "Editar colaborador" : "Novo colaborador"}
      >
        <form action={collabAction} className="space-y-3">
          {editingCollab?.id && (
            <input type="hidden" name="id" value={editingCollab.id} />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nome *</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              defaultValue={editingCollab?.full_name ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={editingCollab?.phone ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email (login)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={editingCollab?.email ?? ""}
              placeholder="tecnico@empresa.pt"
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="create_login"
                defaultChecked={!editingCollab?.user_id}
                className="rounded border-slate-300"
              />
              Criar / ligar acesso à app
            </label>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password temporária</Label>
              <Input
                id="password"
                name="password"
                type="text"
                autoComplete="new-password"
                placeholder="mín. 6 caracteres"
              />
              <p className="text-xs text-slate-500">
                Partilha email + password com o técnico. Ele entra em /login e
                vê só as tarefas atribuídas.
              </p>
            </div>
            {editingCollab?.user_id && (
              <p className="text-xs text-status-completed">
                Já tem conta Auth ligada.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="role">Perfil</Label>
              <Select
                id="role"
                name="role"
                defaultValue={
                  editingCollab?.role === "manager"
                    ? "admin"
                    : (editingCollab?.role ?? "field_tech")
                }
              >
                <option value="admin">Administrador</option>
                <option value="field_tech">Técnico</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Estado</Label>
              <Select
                id="status"
                name="status"
                defaultValue={editingCollab?.status ?? "active"}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </Select>
            </div>
          </div>
          {collabState && !collabState.ok && (
            <p className="text-sm text-red-600">{collabState.error}</p>
          )}
          {collabState?.ok && collabState.message && (
            <p className="text-sm text-status-completed">{collabState.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCollabOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={collabPending}>
              {collabPending ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
        title={editingTeam ? "Editar equipa" : "Nova equipa"}
      >
        <form action={teamAction} className="space-y-3">
          {editingTeam?.id && (
            <input type="hidden" name="id" value={editingTeam.id} />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={editingTeam?.name ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="leader_id">Responsável</Label>
              <Select
                id="leader_id"
                name="leader_id"
                defaultValue={editingTeam?.leader_id ?? ""}
              >
                <option value="">— Sem líder —</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color_code">Cor</Label>
              <Input
                id="color_code"
                name="color_code"
                type="color"
                defaultValue={editingTeam?.color_code ?? "#0284c7"}
                className="h-10 p-1"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Membros</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
              {collaborators.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    name="member_ids"
                    value={c.id}
                    defaultChecked={editingTeam?.member_ids.includes(c.id)}
                    className="rounded border-slate-300"
                  />
                  {c.full_name}
                </label>
              ))}
              {collaborators.length === 0 && (
                <p className="text-xs text-slate-500">
                  Cria colaboradores primeiro.
                </p>
              )}
            </div>
          </div>
          {teamState && !teamState.ok && (
            <p className="text-sm text-red-600">{teamState.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTeamOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={teamPending}>
              {teamPending ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
