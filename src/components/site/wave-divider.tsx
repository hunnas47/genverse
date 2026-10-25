import { cn } from "@/lib/utils";

/**
 * A section-to-section wave transition. Put the previous section's background
 * on the wrapper and the next section's background on `text-*` via `className`.
 */
export function WaveDivider({
  className,
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative w-full overflow-hidden leading-none",
        className,
      )}
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className={cn(
          "block h-[clamp(2.75rem,6vw,5.5rem)] w-full",
          flip && "rotate-180",
        )}
      >
        <path
          d="M0 58C160 100 320 18 480 42C640 66 800 112 960 86C1120 60 1280 20 1440 50V120H0Z"
          fill="currentColor"
          opacity=".32"
        />
        <path
          d="M0 78C180 42 340 96 520 78C700 60 860 18 1040 42C1220 66 1340 104 1440 72V120H0Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
