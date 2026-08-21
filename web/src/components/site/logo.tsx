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
      {/* width/height here are the INTRINSIC size next/image builds its srcset
          from — not the rendered size, which `h-12`/`h-[4.5rem]` + `w-auto`
          own. With no `sizes` prop next/image emits exactly two candidates,
          `w=<width>` at 1x and `w=<width*2>` at 2x, so declaring the source
          file's real 2048x1024 made every dashboard and playground load
          preload a 2048px-wide (3840px on a retina screen) render of a logo
          that is 72px tall on screen. 288x144 keeps the same 2:1 ratio (so
          nothing shifts) and lands the 2x candidate at 640px — still ~4x
          oversampled at the largest size this ever draws at. */}
      <Image
        src="/brand/nebula-lockup-white.png"
        alt="Nebula Genç Zeka"
        width={288}
        height={144}
        priority
        className={cn("hidden w-auto sm:block", large ? "h-[4.5rem]" : "h-12")}
      />
      <Image
        src="/brand/nebula-square.png"
        alt="Nebula Genç Zeka"
        width={128}
        height={128}
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
