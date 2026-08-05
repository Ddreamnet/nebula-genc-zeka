import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** Brand lockup — circular Pillars mark + wordmark. Links home, unless disableLink is set. */
export function Logo({
  className,
  showText = true,
  light = false,
  disableLink = false,
  large = false,
}: {
  className?: string;
  showText?: boolean;
  /** Panel-header treatment: the pre-made white lockup (logo/2048white.png
   *  — icon + "NEBULA / GENÇ ZEKA") on tablet/desktop, swapping to the
   *  square icon+text badge (logo/1024.png) on mobile where the wide
   *  horizontal lockup doesn't have room — floating transparent panel
   *  headers read better with this solid brand mark than tokenized ink. */
  light?: boolean;
  /** Dashboard panels: the logo is a brand mark only there, not a link
   *  back out to the public marketing site. */
  disableLink?: boolean;
  /** 1.5x size — dashboard panel headers. */
  large?: boolean;
}) {
  const content = light ? (
    <>
      <Image
        src="/brand/nebula-lockup-white.png"
        alt="Nebula Genç Zeka"
        width={2048}
        height={1024}
        priority
        className={cn("hidden w-auto sm:block", large ? "h-[4.5rem]" : "h-12")}
      />
      <Image
        src="/brand/nebula-square.png"
        alt="Nebula Genç Zeka"
        width={1024}
        height={1024}
        priority
        className={cn("rounded-full ring-1 ring-white/10 sm:hidden", large ? "size-[3.75rem]" : "size-10")}
      />
    </>
  ) : (
    <>
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
    </>
  );

  const wrapperClassName = cn(light ? "inline-flex items-center" : "group inline-flex items-center gap-2.5", className);

  if (disableLink) {
    return (
      <span aria-label="Nebula Genç Zeka" className={wrapperClassName}>
        {content}
      </span>
    );
  }

  return (
    <Link href="/" aria-label="Nebula Genç Zeka — ana sayfa" className={wrapperClassName}>
      {content}
    </Link>
  );
}
