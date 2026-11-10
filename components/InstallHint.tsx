"use client";

import { useState, useSyncExternalStore } from "react";

const KEY = "readlet:install-hint-dismissed";
const noop = () => () => {};

function shouldShow() {
  try {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    return ios && !standalone && localStorage.getItem(KEY) !== "1";
  } catch {
    return false;
  }
}

/** On iPhone, suggest Add to Home Screen: Safari can clear storage (and the key) for sites left unopened. */
export function InstallHint() {
  const show = useSyncExternalStore(noop, shouldShow, () => false);
  const [hidden, setHidden] = useState(false);
  if (!show || hidden) return null;
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-primary/50 bg-surface p-4">
      <p className="flex-1 text-sm">Add to Home Screen (Share menu) to stay signed in.</p>
      <button
        type="button"
        className="min-h-11 rounded-xl px-2 font-extrabold text-text-muted"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
          setHidden(true);
        }}
      >
        OK
      </button>
    </div>
  );
}
