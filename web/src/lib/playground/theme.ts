/**
 * The Playground's optional "Koyu" theme — Claude's warm dark palette, laid
 * over the panel token set (see the `.pg-theme-dark` block in globals.css).
 *
 * An admin/teacher affordance only. The choice is remembered in localStorage
 * under DARK_THEME_KEY ("1" = on) and expressed as one class on <html>, so
 * both the layout's wrapper div and the portal-bearing <body> fall under
 * `.pg-theme-dark .panel-theme`.
 */
export const DARK_THEME_KEY = "pg-dark-theme";
export const DARK_THEME_CLASS = "pg-theme-dark";

/**
 * Inlined by app/playground/page.tsx for accounts that may choose. Runs while
 * the HTML is still parsing, ahead of hydration and of the first paint, so a
 * remembered choice never shows a frame of ice-blue first.
 */
export const DARK_THEME_BOOT = `try{if(localStorage.getItem(${JSON.stringify(DARK_THEME_KEY)})==="1")document.documentElement.classList.add(${JSON.stringify(DARK_THEME_CLASS)})}catch(e){}`;
