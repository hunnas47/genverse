import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  priority = false,
  showExplorer = true,
}: {
  className?: string;
  priority?: boolean;
  showExplorer?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="GEN M Explorer home"
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <Image
        src="/images/genm-logo.png"
        alt="GEN M"
        width={512}
        height={177}
        priority={priority}
        className="h-9 w-auto sm:h-10"
      />
      {showExplorer && (
        <span className="border-l border-white/25 pl-2.5 font-display text-[10px] font-bold tracking-[0.2em] text-lime uppercase">
          Explorer
        </span>
      )}
    </Link>
  );
}
