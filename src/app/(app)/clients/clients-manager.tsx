"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Client } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deleteClient, upsertClient, type ActionResult } from "./actions";
import { formatClientAddress } from "@/lib/forms";

const initial: ActionResult | null = null;

function ClientFormFields({ client }: { client?: Client | null }) {
  return (
    <div className="space-y-3">
      {client?.id && <input type="hidden" name="id" value={client.id} />}
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={client?.name ?? ""}
          placeholder="Nome do cliente"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact_name">Pessoa de contacto</Label>
        <Input
          id="contact_name"
          name="contact_name"
          defaultValue={client?.contact_name ?? ""}
          placeholder="Nome da pessoa de contacto"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="vat_number">NIF</Label>
          <Input
            id="vat_number"
            name="vat_number"
            defaultValue={client?.vat_number ?? ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={client?.phone ?? ""}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={client?.email ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="street">Rua</Label>
        <Input
          id="street"
          name="street"
          defaultValue={client?.street ?? client?.address ?? ""}
          placeholder="Rua, número, andar…"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="postal_code">Código postal</Label>
          <Input
            id="postal_code"
            name="postal_code"
            defaultValue={client?.postal_code ?? ""}
            placeholder="0000-000"
            autoComplete="postal-code"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="locality">Localidade</Label>
          <Input
            id="locality"
            name="locality"
            defaultValue={client?.locality ?? ""}
            placeholder="Cidade / freguesia"
            autoComplete="address-level2"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" defaultValue={client?.notes ?? ""} />
      </div>
    </div>
  );
}

export function ClientsManager({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [state, action, pending] = useActionState(upsertClient, initial);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      setEditing(null);
      router.refresh();
    }
  }, [state, router]);

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return [
      c.name,
      c.contact_name,
      c.email,
      c.phone,
      c.street,
      c.postal_code,
      c.locality,
      c.address,
      c.vat_number,
    ]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setOpen(true);
  }

  async function onDelete(id: string) {
    if (!confirm("Eliminar este cliente?")) return;
    const result = await deleteClient(id);
    if (!result.ok) alert(result.error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            CRUD de clientes e dados de contacto.
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pesquisa</CardTitle>
          <CardDescription>Nome, NIF, contacto ou morada.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar clientes…"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de clientes</CardTitle>
          <CardDescription>
            {filtered.length} de {clients.length} cliente(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
              Nenhum cliente encontrado.
            </div>
          ) : (
            filtered.map((client) => (
              <div
                key={client.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-brand-navy">{client.name}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {[
                      client.contact_name,
                      client.vat_number && `NIF ${client.vat_number}`,
                      client.phone,
                      client.email,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Sem contactos"}
                  </p>
                  {formatClientAddress(client) && (
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {formatClientAddress(client)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openEdit(client)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(client.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar cliente" : "Novo cliente"}
        description="Nome, pessoa de contacto, morada e NIF."
      >
        <form action={action} className="space-y-4">
          <ClientFormFields client={editing} />
          {state && !state.ok && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
