import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Next 16 also emits generated route/validator types HERE, which the
    // upstream ignore list predates. Without this they contribute 86 of the
    // project's ~116 lint problems (@ts-ignore, any, empty interfaces) and
    // bury the real ones in noise.
    "src/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      /**
       * Advisory, not an error, and deliberately so.
       *
       * The React Compiler's rule fires on 19 places in this codebase and
       * every one of them is the same two shapes: "fetch when the dialog
       * opens, then setState", and "mirror a prop into local state" (a
       * Reveal falling back to visible when IntersectionObserver is absent,
       * a topic card following an `expandAll` prop). React's own
       * documentation still describes effect-based fetching as correct
       * outside a framework data layer, and this app has no such layer.
       *
       * Rewriting nineteen working dialogs to silence an advisory would be
       * pure risk. It stays visible as a warning so new instances are seen,
       * but it must not be the thing that fails a CI lint run.
       *
       * The genuinely wrong instances the rule caught HAVE been fixed: the
       * two places that derived a slot list inside an effect from a stale
       * closure now do it in their change handler.
       */
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
