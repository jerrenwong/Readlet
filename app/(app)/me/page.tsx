"use client";

import Link from "next/link";
import { useState } from "react";
import { LogSheet } from "@/components/LogSheet";
import { ProfileView } from "@/components/Profile";
import { Spinner } from "@/components/ui";
import { useUserEntries, type Entry } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";
import { localDate } from "@/lib/streaks";

export default function MePage() {
  const { userId, profile } = useReady();
  const { entries, isLoading } = useUserEntries(userId);
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
          <Link
            href="/settings"
            className="flex min-h-12 items-center justify-center border border-field bg-surface font-semibold hover:border-text"
          >
            Settings
          </Link>
        }
      />
      <LogSheet open={open} editing={editing} onClose={() => setOpen(false)} />
    </>
  );
}
