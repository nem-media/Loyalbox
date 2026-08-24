"use client";

import { useActionState } from "react";
import {
  updateEmployee,
  setEmployeeActive,
  removeEmployee,
  resendEmployeeInvite,
} from "./actions";
import type { FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { PERMISSION_FIELDS } from "@/lib/employees";

export interface EmployeeRow {
  id: string;
  name: string;
  email: string | null;
  is_active: boolean;
  can_stamp: boolean;
  can_discount: boolean;
  can_redeem: boolean;
  /** Har medarbejderen logget ind mindst én gang? */
  hasSignedIn: boolean;
}

/**
 * Én medarbejder med sine knapper.
 *
 * Hver handling er sin egen formular med sin egen tilstand. Havde de delt én,
 * ville en kvittering fra "send link igen" stå og lyse over rettighederne, som
 * om de var gemt.
 */
export function EmployeeCard({ employee }: { employee: EmployeeRow }) {
  const [perm, permAction, permPending] = useActionState<FormResult, FormData>(
    updateEmployee,
    {},
  );
  const [active, activeAction, activePending] = useActionState<
    FormResult,
    FormData
  >(setEmployeeActive, {});
  const [invite, inviteAction, invitePending] = useActionState<
    FormResult,
    FormData
  >(resendEmployeeInvite, {});
  const [removed, removeAction, removePending] = useActionState<
    FormResult,
    FormData
  >(removeEmployee, {});

  const besked =
    perm.message ?? active.message ?? invite.message ?? removed.message;
  const fejl = perm.error ?? active.error ?? invite.error ?? removed.error;

  return (
    <Card className={employee.is_active ? undefined : "opacity-70"}>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{employee.name}</h3>
            {employee.email ? (
              <p className="text-sm text-muted">{employee.email}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {employee.is_active ? (
              <Badge tone="success">Aktiv</Badge>
            ) : (
              <Badge tone="neutral">Adgang lukket</Badge>
            )}
            {employee.hasSignedIn ? null : (
              <Badge tone="warning">Har ikke logget ind endnu</Badge>
            )}
          </div>
        </div>

        <form action={permAction} className="space-y-2">
          <input type="hidden" name="id" value={employee.id} />
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {PERMISSION_FIELDS.map((f) => (
              <label key={f.name} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={f.name}
                  defaultChecked={employee[f.name]}
                  className="h-4 w-4 accent-[color:var(--color-accent,#1e1c1a)]"
                />
                {f.label}
              </label>
            ))}
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={permPending}>
            {permPending ? "Gemmer…" : "Gem rettigheder"}
          </Button>
        </form>

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <form action={activeAction}>
            <input type="hidden" name="id" value={employee.id} />
            <input
              type="hidden"
              name="active"
              value={employee.is_active ? "false" : "true"}
            />
            <Button type="submit" size="sm" variant="ghost" disabled={activePending}>
              {employee.is_active ? "Luk adgang" : "Giv adgang igen"}
            </Button>
          </form>

          {employee.email ? (
            <form action={inviteAction}>
              <input type="hidden" name="id" value={employee.id} />
              <Button type="submit" size="sm" variant="ghost" disabled={invitePending}>
                {invitePending ? "Sender…" : "Send login-link igen"}
              </Button>
            </form>
          ) : null}

          <form action={removeAction}>
            <input type="hidden" name="id" value={employee.id} />
            <Button type="submit" size="sm" variant="ghost" disabled={removePending}>
              Fjern
            </Button>
          </form>
        </div>

        {fejl ? <p className="text-sm text-danger">{fejl}</p> : null}
        {besked ? <p className="text-sm text-accent">{besked}</p> : null}
      </CardBody>
    </Card>
  );
}
