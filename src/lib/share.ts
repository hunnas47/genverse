export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

/**
 * Opens the phone's share sheet (WhatsApp, Instagram, …) when the browser has
 * one, and otherwise copies the message and link to the clipboard.
 */
export async function shareLink({
  title,
  text,
  url,
}: {
  title: string;
  text: string;
  url: string;
}): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // Fall through to the clipboard when the share sheet is unavailable.
    }
  }

  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}

/** The message used when a player shares a completed shell set. */
export function fullSetShareMessage(total: number, points: number) {
  return {
    title: "GEN M Explorer",
    text: `I found all ${total} shells on the GEN M beach today 🐚 ${points} points. Can you find them all?`,
    url:
      typeof window === "undefined"
        ? "/explore"
        : `${window.location.origin}/explore`,
  };
}
