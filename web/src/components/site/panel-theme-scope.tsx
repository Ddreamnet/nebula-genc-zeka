"use client";

import { useEffect } from "react";

const CLASSES = ["panel-theme", "panel-grid-bg", "bg-surface", "text-on-surface", "font-sans"];

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
