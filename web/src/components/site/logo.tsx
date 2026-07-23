import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** Brand lockup — circular Pillars mark + wordmark. Links home. */
export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="Nebula Genç Zeka — ana sayfa"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <Image
        src="/brand/nebula-icon.png"
        alt=""
        width={40}
        height={40}
        priority
        className="size-9 rounded-full ring-1 ring-white/10 transition duration-300 group-hover:ring-secondary/40"
      />
      {showText && (
        <span className="font-display text-lg font-semibold tracking-tight text-on-surface">
          Nebula{" "}
          <span className="font-normal text-on-surface-variant">Genç Zeka</span>
        </span>
      )}
    </Link>
  );
}
