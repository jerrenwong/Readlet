"use client";

import { useState, type FormEvent } from "react";
import { entryContent, type EntryContent } from "@/lib/crypto/entry";
import { useDeleteEntry, useSaveEntry, type Entry } from "@/lib/data/hooks";
import { Button } from "./Button";
import { Sheet } from "./Sheet";
import { Field, Input, LockIcon, TextArea } from "./ui";

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
      {/* Remount per entry so the form starts from that entry's values. */}
      <EntryForm key={editing?.id ?? "new"} editing={editing} onDone={onClose} onSaved={onSaved} />
    </Sheet>
  );
}

function EntryForm({
  editing,
  onDone,
  onSaved,
}: {
  editing?: Entry | null;
  onDone: () => void;
  onSaved?: (created: boolean) => void;
}) {
  const [title, setTitle] = useState(editing?.content?.title ?? "");
  const [url, setUrl] = useState(editing?.content?.url ?? "");
  const [notes, setNotes] = useState(editing?.content?.notes ?? "");
  const [errors, setErrors] = useState<Partial<Record<keyof EntryContent | "form", string>>>({});
  const save = useSaveEntry();
  const del = useDeleteEntry();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = entryContent.safeParse({
      v: 1,
      title: title.trim(),
      url: url.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof EntryContent;
        next[k] ??=
          k === "title"
            ? title.trim()
              ? "At most 200 characters"
              : "Give it a title"
            : k === "url"
              ? "Use a full http:// or https:// link"
              : "At most 500 characters";
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
      setErrors({ form: err instanceof Error ? err.message : "Couldn't save. Check your connection." });
    }
  }

  async function remove() {
    if (!editing) return;
    try {
      await del.mutateAsync(editing.id);
      onDone();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Couldn't delete." });
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Title" error={errors.title} hint={`${title.length}/200`}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="What did you read?"
          autoComplete="off"
          required
        />
      </Field>
      <Field label="Link (optional)" error={errors.url}>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={2000}
          type="url"
          inputMode="url"
          placeholder="https://"
          autoComplete="off"
        />
      </Field>
      <Field label="Notes (optional)" error={errors.notes} hint={`${notes.length}/500`}>
        <TextArea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          placeholder="Your own thoughts"
          onKeyDown={(e) => {
            // Enter saves on computers; Shift+Enter adds a line.
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
        {save.isPending ? "Saving…" : "Save"}
      </Button>
      {editing && (
        <button
          type="button"
          onClick={remove}
          disabled={del.isPending}
          className="min-h-11 rounded-xl font-extrabold text-danger-text hover:bg-danger/10"
        >
          {del.isPending ? "Deleting…" : "Delete this read"}
        </button>
      )}
      <p className="text-center text-xs text-text-muted"><LockIcon /> Encrypted on this device. Only you and your friends can read it.</p>
    </form>
  );
}
