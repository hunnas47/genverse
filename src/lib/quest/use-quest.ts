"use client";

import { useCallback, useEffect, useState } from "react";

import { liveQuestStore } from "@/lib/quest/live-store";
import type {
  QuestActionResult,
  QuestNameResult,
  QuestSnapshot,
  QuestSyncInfo,
} from "@/types/quest";

/**
 * React view over the server-backed quest store. The store keeps a local
 * snapshot ready immediately and layers the shared state on top, so the map
 * never waits for the network to become usable.
 */
export function useQuest() {
  const [snapshot, setSnapshot] = useState<QuestSnapshot | null>(null);
  const [sync, setSync] = useState<QuestSyncInfo>(() =>
    liveQuestStore.getSyncInfo(),
  );

  useEffect(() => {
    const refresh = () => {
      setSnapshot(liveQuestStore.getSnapshot());
      setSync(liveQuestStore.getSyncInfo());
    };

    refresh();
    const unsubscribe = liveQuestStore.subscribe(refresh);
    const interval = window.setInterval(refresh, 60_000);
    const handleVisibility = () => {
      if (!document.hidden) {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const join = useCallback(
    (name: string): Promise<QuestNameResult> => liveQuestStore.join(name),
    [],
  );
  const collectShell = useCallback(
    (shellId: string): Promise<QuestActionResult> =>
      liveQuestStore.collectShell(shellId),
    [],
  );
  const checkInVenue = useCallback(
    (venueId: string): Promise<QuestActionResult> =>
      liveQuestStore.checkInVenue(venueId),
    [],
  );

  return {
    ready: snapshot !== null,
    snapshot,
    sync,
    join,
    collectShell,
    checkInVenue,
  };
}
