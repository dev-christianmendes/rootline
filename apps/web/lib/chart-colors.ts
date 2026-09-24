/*
 * Resolves design tokens from tokens.css for charting libraries
 * (Recharts / React Flow) that cannot consume Tailwind classes.
 * Values are read once from the computed style and cached; hardcoded
 * hex fallbacks keep SSR and headless rendering safe.
 */

const TOKEN_VAR = {
  info: "--info",
  critical: "--critical",
  warning: "--warning",
  success: "--success",
  muted: "--muted-foreground",
  border: "--border",
  background: "--background",
} as const;

export type ChartColorName = keyof typeof TOKEN_VAR;

const FALLBACK: Record<ChartColorName, string> = {
  info: "#3d7eff",
  critical: "#ef4444",
  warning: "#f59e0b",
  success: "#22c55e",
  muted: "#8b8b93",
  border: "#242428",
  background: "#0a0a0b",
};

let resolved: Record<ChartColorName, string> | null = null;

export function chartColor(name: ChartColorName): string {
  if (!resolved) {
    const colors = { ...FALLBACK };
    if (typeof document !== "undefined") {
      try {
        const styles = getComputedStyle(document.documentElement);
        for (const key of Object.keys(TOKEN_VAR) as ChartColorName[]) {
          const value = styles.getPropertyValue(TOKEN_VAR[key]).trim();
          if (value) colors[key] = value;
        }
      } catch {
        // keep fallbacks
      }
    }
    resolved = colors;
  }
  return resolved[name];
}
