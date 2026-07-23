import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "soft";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-mono text-sm font-medium tracking-wide transition duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const sizeCls: Record<Size, string> = {
  md: "px-5 py-2.5",
  lg: "px-7 py-3.5 text-[15px]",
};

const variantCls: Record<Variant, string> = {
  primary:
    "bg-secondary text-on-secondary hover:brightness-110 shadow-lg shadow-secondary/20 hover:shadow-secondary/40",
  ghost:
    "border border-outline-variant/70 text-on-surface hover:border-secondary/60 hover:text-secondary-bright",
  soft: "border border-white/5 bg-surface-high/70 text-on-surface hover:bg-surface-highest",
};

type ButtonProps = {
  href?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
} & Omit<ComponentProps<"button">, "ref">;

export function Button({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = cn(base, sizeCls[size], variantCls[variant], className);

  if (href) {
    if (/^https?:\/\//.test(href)) {
      return (
        <a href={href} target="_blank" rel="noreferrer" className={cls}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
