"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Card, ErrorNote, Spinner, TextArea } from "@/components/ui";
import { useAddBookmarks, useBookmarkActions, useBookmarks, type Bookmark } from "@/lib/data/bookmarks";

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export default function BookmarksPage() {
  const list = useBookmarks();
  const add = useAddBookmarks();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const urls = [...new Set(text.split(/\s+/).map((s) => s.trim()).filter(Boolean))];
    if (!urls.length) return;
    const bad = urls.filter((u) => !/^https?:\/\/\S+\.\S+/i.test(u));
    if (bad.length) return setError(`Not a link: ${bad[0]}`);
    if (urls.length > 100) return setError("Max. 100 links at once.");
    setError(null);
    try {
      await add.mutateAsync(urls);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl">Bookmarks</h1>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="sr-only" htmlFor="links">
            Links, one per line
          </label>
          <TextArea
            id="links"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste links, one per line"
            rows={3}
          />
          {error && (
            <p className="text-danger-text" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="sm" disabled={add.isPending || !text.trim()}>
            {add.isPending ? "Adding…" : "Add"}
          </Button>
        </form>
      </Card>
      {list.isLoading && <Spinner />}
      {list.error && <ErrorNote>Couldn&apos;t load.</ErrorNote>}
      {list.data?.length === 0 && <p className="text-text-muted">None yet</p>}
      <ul className="flex flex-col gap-2">
        {list.data?.map((b) => (
          <BookmarkRow key={b.id} b={b} />
        ))}
      </ul>
    </div>
  );
}

function BookmarkRow({ b }: { b: Bookmark }) {
  const { read, remove } = useBookmarkActions();
  const busy = read.isPending || remove.isPending;
  return (
    <li className="flex items-center gap-3 border border-flame-off bg-surface p-3">
      <div className="min-w-0 flex-1">
        <a
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate font-semibold text-accent-text underline decoration-2 underline-offset-2"
        >
          {b.title ?? b.url}
        </a>
        <p className="truncate text-sm text-text-muted">{host(b.url)}</p>
        {read.error && <p className="text-sm text-danger-text">{read.error.message}</p>}
      </div>
      <Button size="sm" disabled={busy} onClick={() => read.mutate(b.id)}>
        Read
      </Button>
      <button
        type="button"
        aria-label={`Remove ${b.title ?? b.url}`}
        disabled={busy}
        onClick={() => remove.mutate(b.id)}
        className="flex size-11 items-center justify-center text-2xl text-text-muted hover:text-text"
      >
        ×
      </button>
    </li>
  );
}
