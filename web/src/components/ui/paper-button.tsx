import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The site's only button.
 *
 * Renders the two-layer cut-paper control described in landing.css: a slab
 * (::before) that stays put and a face that translates. Call sites never write
 * that markup by hand, which is what keeps every button on the site pressing
 * with identical physics.
 *
 * Picks its element from the props it's given — `href` starting with "/" or "#"
 * becomes a <Link>, an external href becomes an <a> with the safe rel, and
 * anything else is a <button>. That's deliberate: a CTA row mixes all three,
 * and forcing the caller to choose the element is how the styling drifted
 * apart last time.
 */

type Tone = "blue" | "amber" | "mint" | "coral" | "violet" | "green" | "paper" | "ghost-space";
type Size = "sm" | "md" | "lg";

type BaseProps = {
  tone?: Tone;
  size?: Size;
  children: ReactNode;
  className?: string;
  /** Icon-only: square face, and `children` must be just the icon. */
  icon?: boolean;
};

function classes(tone: Tone, size: Size, icon: boolean, className?: string) {
  return cn(
    // `inline-flex` rides along as a Tailwind utility rather than living in
    // landing.css, so that a caller's `md:hidden` — same layer, later source
    // order — actually wins. See the note on .nb-btn in landing.css.
    "nb-btn inline-flex",
    `nb-btn--${tone}`,
    size !== "md" && `nb-btn--${size}`,
    icon && "nb-icon-btn",
    className,
  );
}

export function PaperButton({
  tone = "blue",
  size = "md",
  icon = false,
  children,
  className,
  href,
  external,
  ...rest
}: BaseProps & {
  href?: string;
  external?: boolean;
} & Omit<ComponentProps<"button">, "children" | "className"> &
  Omit<ComponentProps<"a">, "children" | "className" | "href">) {
  const face = <span className="nb-btn__face">{children}</span>;
  const cls = classes(tone, size, icon, className);

  if (href) {
    const isExternal = external ?? /^https?:|^mailto:|^tel:/.test(href);
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
          {...(rest as ComponentProps<"a">)}
        >
          {face}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...(rest as Omit<ComponentProps<typeof Link>, "href">)}>
        {face}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} {...(rest as ComponentProps<"button">)}>
      {face}
    </button>
  );
}
