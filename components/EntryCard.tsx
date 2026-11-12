import type { Entry } from "@/lib/data/hooks";
import { Avatar } from "./Avatar";
import { StreakBadge } from "./StreakFlame";

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** One read. With `author`, shows who wrote it (Feed); with `onEdit`, it's editable (today's own). */
export function EntryCard({
  entry,
  author,
  streak,
  onEdit,
}: {
  entry: Entry;
  author?: { display_name: string; username: string; color?: string | null } | null;
  streak?: number;
  onEdit?: () => void;
}) {
  const c = entry;
  return (
    <article className="rounded-[var(--radius-card)] bg-surface p-4 shadow-sm">
      {author && (
        <header className="mb-2 flex items-center gap-2">
          <a href={`/u/${author.username}`} className="flex min-h-11 items-center gap-2">
            <Avatar name={author.display_name} color={author.color} size={32} />
            <span className="font-extrabold">{author.display_name}</span>
          </a>
          {streak !== undefined && <StreakBadge n={streak} />}
          <time className="ml-auto text-sm text-text-muted" dateTime={entry.created_at}>
            {new Date(entry.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </time>
        </header>
      )}
      {(
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg leading-snug break-words">
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-text underline decoration-2 underline-offset-2"
                >
                  {c.title}
                </a>
              ) : (
                c.title
              )}
            </h3>
            {c.url && <p className="text-sm text-text-muted">{host(c.url)}</p>}
            {c.notes && <p className="mt-2 whitespace-pre-wrap break-words">{c.notes}</p>}
          </div>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="min-h-11 shrink-0 rounded-xl px-3 font-extrabold text-accent-text hover:bg-accent/10"
            >
              Edit
            </button>
          )}
        </div>
      )}
    </article>
  );
}
