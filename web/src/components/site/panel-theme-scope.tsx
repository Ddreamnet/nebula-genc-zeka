"use client";

import { useEffect } from "react";
import { landingFontClass } from "@/lib/landing-fonts";

/**
 * The font classes matter as much as the theme ones. next/font exposes each
 * face as a CSS variable scoped to whatever element carries its generated
 * class — and the panel layouts put that class on their wrapper div. But
 * .panel-theme resolves --font-sans to `var(--font-nunito)`, so anything
 * rendered OUTSIDE that wrapper (every portaled dialog, popover and toast)
 * hit an undefined variable, which makes the whole declaration invalid at
 * computed-value time and drops the element to the browser's default face.
 * Carrying the font classes on <body> too puts the variables above both trees.
 */
const CLASSES = [
  "panel-theme",
  "panel-grid-bg",
  "bg-surface",
  "text-on-surface",
  "font-sans",
  ...landingFontClass.split(" ").filter(Boolean),
];

/**
 * Toggles the panel/auth theme classes directly on <body> instead of a
 * wrapper div. Radix portals (Dialog/AlertDialog/Popover/Tooltip) render
 * their content as direct children of <body>, bypassing any wrapper div
 * in the normal component tree — a class scoped only to a wrapper never
 * reaches them. Scoping on <body> itself covers both the normal tree and
 * anything portaled, since <body> is an ancestor of both.
 */
export function PanelThemeScope() {
  useEffect(() => {
    document.body.classList.add(...CLASSES);
    return () => {
      document.body.classList.remove(...CLASSES);
    };
  }, []);

  return null;
}
