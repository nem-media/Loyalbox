"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStandAdmin, type FormResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddStand({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    createStandAdmin,
    {},
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex flex-wrap gap-2">
      <input type="hidden" name="company_id" value={companyId} />
      <Input name="name" placeholder="Navn på ny stander" required className="min-w-56 flex-1" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Opretter…" : "Tilføj stander"}
      </Button>
      {state.error ? <p className="w-full text-sm text-danger">{state.error}</p> : null}
    </form>
  );
}
