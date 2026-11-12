"use client";

import { useState, type FormEvent } from "react";
import { useApiTokenActions, useApiTokens } from "@/lib/data/bookmarks";
import { Button } from "./Button";
import { Card, Field, Input } from "./ui";

/** Personal API tokens for agents and scripts (bookmarks only). */
export function ApiTokens() {
  const tokens = useApiTokens();
  const { create, revoke } = useApiTokenActions();
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const t = await create.mutateAsync(name.trim()).catch(() => null);
    if (t) {
      setFresh(t);
      setName("");
      setCopied(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-2xl">API tokens</h2>
      <p className="text-sm text-text-muted">Let an agent add bookmarks for you.</p>
      {fresh && (
        <div className="flex flex-col gap-2 border border-accent p-3">
          <p className="text-sm font-semibold">Copy now; it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate bg-background px-3 py-2 text-sm">{fresh}</code>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(fresh).catch(() => {});
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="overflow-x-auto bg-background p-3 text-xs">{`curl -X POST ${origin}/api/bookmarks \\
  -H "Authorization: Bearer ${fresh.slice(0, 7)}…" \\
  -H "Content-Type: application/json" \\
  -d '{"urls":["https://example.com/article"]}'`}</pre>
        </div>
      )}
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Name" error={create.error?.message}>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Claude" />
          </Field>
        </div>
        <Button type="submit" size="sm" className="!min-h-12" disabled={create.isPending || !name.trim()}>
          Create
        </Button>
      </form>
      {!!tokens.data?.length && (
        <ul className="flex flex-col gap-2">
          {tokens.data.map((t) => (
            <li key={t.id} className="flex items-center gap-3 border border-flame-off p-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{t.name}</span>
                <span className="block text-sm text-text-muted">
                  {t.last_used_at ? `Used ${new Date(t.last_used_at).toLocaleDateString()}` : "Never used"}
                </span>
              </span>
              <button
                type="button"
                className="min-h-11 px-3 font-semibold text-danger-text hover:bg-danger/10"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(t.id)}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
