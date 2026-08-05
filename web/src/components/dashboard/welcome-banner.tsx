import { cn } from "@/lib/cn";

// Longer names need a smaller size to guarantee the greeting never wraps to
// a second line — "header" sits inline next to the logo so gets a tighter
// scale than "banner" (its own dedicated row, only shown on mobile).
function sizeClass(name: string, variant: "header" | "banner") {
  const len = name.length;
  if (variant === "header") {
    if (len <= 10) return "text-base";
    if (len <= 16) return "text-sm";
    if (len <= 22) return "text-xs";
    return "text-[11px]";
  }
  if (len <= 10) return "text-xl";
  if (len <= 16) return "text-lg";
  if (len <= 22) return "text-base";
  return "text-sm";
}

/**
 * "Hoş geldin, {name}" greeting. Two call sites share this component:
 * `variant="header"` renders inline next to the logo and is desktop-only;
 * `variant="banner"` renders its own row right below the header and is
 * mobile-only. Both always stay a single line — the name truncates instead
 * of wrapping if it's still too long after the font-size step-down above.
 */
export function WelcomeBanner({ name, variant }: { name: string; variant: "header" | "banner" }) {
  return (
    <div
      className={cn(
        "min-w-0 items-center justify-center gap-2",
        variant === "header" ? "hidden sm:flex" : "flex w-full px-4 pt-1 pb-3 sm:hidden",
      )}
    >
      <span
        className={cn(
          "min-w-0 truncate font-kid font-semibold text-on-surface",
          variant === "header" && "max-w-[280px]",
          sizeClass(name, variant),
        )}
      >
        Hoş geldin, <span className="text-secondary">{name}</span>
      </span>
      <span className="animate-wave-once inline-block shrink-0" aria-hidden>
        👋
      </span>
    </div>
  );
}
