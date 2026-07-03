"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  label = "Kopiér link",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? "Kopieret!" : label}
    </Button>
  );
}
