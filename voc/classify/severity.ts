import { createRequire } from "node:module";

import type { Severity, SevBand, Source } from "./types.js";

// Load the canonical rubric JSON at module init time.
// Both severity.ts and severity.py read this file — do not duplicate constants.
const require = createRequire(import.meta.url);
const RUBRIC = require("./severity_rubric.json") as RubricJson;

interface RubricJson {
  bands: Record<string, string>;
  data_loss_keywords: string[];
  security_keywords: string[];
  source_weights: Record<string, number>;
  high_volume_upvote_threshold: number;
  high_volume_reply_threshold: number;
  p0_themes: string[];
  p1_themes: string[];
  p2_themes: string[];
  p3_themes: string[];
}

export interface SeveritySignal {
  source: Source;
  themes: string[];
  upvotes?: number;
  reply_count?: number;
  is_authenticated_bug?: boolean;
  contains_data_loss_keyword?: boolean;
  body_text?: string;
}

export interface SeverityResult {
  severity: Severity;
  sev_band: SevBand;
  rationale: string;
}

/** Map a Severity level to its SEV band. Pure, reads from rubric. */
export function bandFor(s: Severity): SevBand {
  return (RUBRIC.bands[s] ?? "SEV2") as SevBand;
}

/**
 * Score a SeveritySignal against the rubric and return severity + rationale.
 * Implemented as an early-exit if-chain: the first matching clause wins.
 * Each clause is labelled with the rubric paragraph it implements.
 */
export function score(signal: SeveritySignal): SeverityResult {
  const bodyLower = (signal.body_text ?? "").toLowerCase();
  const themesLower = signal.themes.map((t) => t.toLowerCase());

  const hasDataLoss =
    signal.contains_data_loss_keyword === true ||
    RUBRIC.data_loss_keywords.some((kw) => bodyLower.includes(kw));

  const hasSecurity =
    RUBRIC.security_keywords.some((kw) => bodyLower.includes(kw)) ||
    themesLower.some((t) => RUBRIC.p0_themes.includes(t));

  // P0 / SEV0 — data loss, security exposure, or core feature regression. [rubric §P0]
  if (hasDataLoss) {
    return { severity: "P0", sev_band: "SEV0", rationale: "data-loss keyword detected in body" };
  }
  if (hasSecurity) {
    return { severity: "P0", sev_band: "SEV0", rationale: "security keyword or P0 theme detected" };
  }
  if (signal.is_authenticated_bug === true && signal.source === "github") {
    const isP0Theme = themesLower.some((t) => RUBRIC.p0_themes.includes(t));
    if (isP0Theme) {
      return { severity: "P0", sev_band: "SEV0", rationale: "authenticated GitHub bug with P0 theme" };
    }
  }

  // P1 / SEV1 — high-volume frustration or missing expected functionality. [rubric §P1]
  const hasP1Theme = themesLower.some((t) => RUBRIC.p1_themes.includes(t));
  const isHighVolume =
    (signal.upvotes ?? 0) >= RUBRIC.high_volume_upvote_threshold ||
    (signal.reply_count ?? 0) >= RUBRIC.high_volume_reply_threshold;
  const sourceWeight = RUBRIC.source_weights[signal.source] ?? 1.0;

  if (hasP1Theme && isHighVolume) {
    return { severity: "P1", sev_band: "SEV1", rationale: "P1 theme with high-volume engagement" };
  }
  if (hasP1Theme && sourceWeight >= 1.2) {
    // High-authority source (GitHub or harness) with a P1 theme is P1 even at low volume.
    return { severity: "P1", sev_band: "SEV1", rationale: `P1 theme from high-weight source (${signal.source})` };
  }
  if (signal.is_authenticated_bug === true && hasP1Theme) {
    return { severity: "P1", sev_band: "SEV1", rationale: "authenticated GitHub bug with P1 theme" };
  }

  // P2 / SEV1 — broadly noted annoyance or edge-case bugs. [rubric §P2]
  const hasP2Theme = themesLower.some((t) => RUBRIC.p2_themes.includes(t));
  if (hasP2Theme) {
    return { severity: "P2", sev_band: "SEV1", rationale: "P2 theme detected (annoyance / edge-case)" };
  }
  if (isHighVolume && !hasP3ThemeOnly(themesLower)) {
    // High engagement without a P1 theme and not exclusively P3 → P2.
    return { severity: "P2", sev_band: "SEV1", rationale: "high-volume post without P1/P3-only theme" };
  }

  // P3 / SEV2 — single-source nitpick, feature request, or comment. [rubric §P3]
  return { severity: "P3", sev_band: "SEV2", rationale: "no high-priority signal detected" };
}

/** True when all themes are exclusively P3-level. */
function hasP3ThemeOnly(themesLower: string[]): boolean {
  if (themesLower.length === 0) return true;
  return themesLower.every((t) => RUBRIC.p3_themes.includes(t));
}
