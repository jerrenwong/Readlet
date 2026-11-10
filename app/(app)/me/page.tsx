"use client";

import Link from "next/link";
import { useState } from "react";
import { LogSheet } from "@/components/LogSheet";
import { ProfileView } from "@/components/Profile";
import { Spinner } from "@/components/ui";
import { useRequests, useUserEntries, type Entry } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";
import { localDate } from "@/lib/streaks";

export default function MePage() {
  const { userId, profile } = useReady();
  const { entries, isLoading } = useUserEntries(userId);
  const requests = useRequests();
  const incoming = requests.data?.filter((r) => r.incoming).length ?? 0;
  const [editing, setEditing] = useState<Entry | null>(null);
  const [open, setOpen] = useState(false);
  if (isLoading || !entries) return <Spinner />;
  return (
    <>
      <ProfileView
        user={profile}
        entries={entries}
        today={localDate(profile.timezone)}
        onEdit={(e) => {
          setEditing(e);
          setOpen(true);
        }}
        actions={
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/friends"
              className="relative flex min-h-12 items-center justify-center rounded-2xl bg-surface font-extrabold shadow-sm"
            >
              Friends
              {incoming > 0 && (
                <span className="ml-2 rounded-full bg-danger-text px-2 text-sm text-white">{incoming} new</span>
              )}
            </Link>
            <Link
              href="/settings"
              className="flex min-h-12 items-center justify-center rounded-2xl bg-surface font-extrabold shadow-sm"
            >
              Settings
            </Link>
          </div>
        }
      />
      <LogSheet open={open} editing={editing} onClose={() => setOpen(false)} />
    </>
  );
}
