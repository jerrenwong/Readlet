"use client";

import { useRef, useState, type FormEvent } from "react";
import { entrySchema } from "@/lib/entry";
import { useDeleteEntry, useSaveEntry, type Entry } from "@/lib/data/hooks";
import { supabase } from "@/lib/supabase/client";
import { Button } from "./Button";
import { Sheet } from "./Sheet";
import { Field, Input, TextArea } from "./ui";

/** Log a read (new) or edit one of today's entries. */
export function LogSheet({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Entry | null;
  onSaved?: (created: boolean) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit read" : "Log a read"}>
      <EntryForm key={editing?.id ?? "new"} editing={editing} onDone={onClose} onSaved={onSaved} />
    </Sheet>
  );
}

async function fetchTitle(url: string): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  try {
    const res = await fetch(`/api/title?url=${encodeURIComponent(url)}`, { headers: { authorization: `Bearer ${token}` } });
    return res.ok ? ((await res.json()) as { title: string | null }).title : null;
  } catch {
    return null;
  }
}

type Errors = Partial<Record<"title" | "url" | "notes" | "form", string>>;

function EntryForm({
  editing,
  onDone,
  onSaved,
}: {
  editing?: Entry | null;
  onDone: () => void;
  onSaved?: (created: boolean) => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [url, setUrl] = useState(editing?.url ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [suggesting, setSuggesting] = useState(false);
  const titleEdited = useRef(!!editing);
  const lastLooked = useRef("");
  const save = useSaveEntry();
  const del = useDeleteEntry();

  async function suggest(raw: string) {
    const u = raw.trim();
    if (titleEdited.current || u === lastLooked.current || !/^https?:\/\/\S+\.\S+/i.test(u)) return;
    lastLooked.current = u;
    setSuggesting(true);
    const t = await fetchTitle(u);
    setSuggesting(false);
    if (t && !titleEdited.current) setTitle(t);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = entrySchema.safeParse({ title, url: url.trim() || undefined, notes: notes.trim() || undefined });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as "title" | "url" | "notes";
        next[k] ??= k === "title" ? (title.trim() ? "Max. 200 characters" : "Required") : k === "url" ? "Invalid link" : "Max. 500 characters";
      }
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      const r = await save.mutateAsync({ id: editing?.id, content: parsed.data });
      onDone();
      onSaved?.(r.created);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Save failed." });
    }
  }

  async function remove() {
    if (!editing) return;
    try {
      await del.mutateAsync(editing.id);
      onDone();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Delete failed." });
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Link" error={errors.url}>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={(e) => void suggest(e.clipboardData.getData("text"))}
          onBlur={(e) => void suggest(e.target.value)}
          maxLength={2000}
          type="url"
          inputMode="url"
          placeholder="https://"
          autoComplete="off"
        />
      </Field>
      <Field label="Title" error={errors.title} hint={suggesting ? "Fetching title…" : undefined}>
        <Input
          value={title}
          onChange={(e) => {
            titleEdited.current = e.target.value !== "";
            setTitle(e.target.value);
          }}
          maxLength={200}
          autoComplete="off"
          required
        />
      </Field>
      <Field label="Notes" error={errors.notes}>
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 1024px)").matches) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
      </Field>
      {errors.form && (
        <p className="text-danger-text" role="alert">
          {errors.form}
        </p>
      )}
      <Button type="submit" disabled={save.isPending}>
        Save
      </Button>
      {editing && (
        <button
          type="button"
          onClick={remove}
          disabled={del.isPending}
          className="min-h-11 rounded-xl font-extrabold text-danger-text hover:bg-danger/10"
        >
          Delete
        </button>
      )}
    </form>
  );
}
