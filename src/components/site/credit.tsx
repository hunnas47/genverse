import { cn } from "@/lib/utils";

export function Credit({
  className,
  linkClassName,
}: {
  className?: string;
  linkClassName?: string;
}) {
  return (
    <p className={cn("text-[11px] leading-relaxed", className)}>
      Built with <span aria-hidden="true">❤️</span>
      <span className="sr-only">love</span> by{" "}
      <a
        href="http://instagram.com/hadihunnas"
        target="_blank"
        rel="noreferrer"
        className={cn(
          "font-medium underline decoration-1 underline-offset-2 transition hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2",
          linkClassName,
        )}
      >
        hunnas
      </a>
    </p>
  );
}
