import { z } from "zod";

import type { Classification, Severity, SevBand, Source } from "./types.js";

export interface ClassifyRequest {
  postId: string;
  body: string;
  source: Source;
}

// Re-export so callers can import from a single module.
export type { Classification };

const OLLAMA_HOST = process.env["OLLAMA_HOST"] ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env["OLLAMA_MODEL"] ?? "llama3.1:8b";

/** System prompt — embedded here so it's versionable alongside the code. */
const SYSTEM_PROMPT = `You are a product quality engineer assistant for the Cursor AI code editor.
Classify the user feedback post provided and return ONLY a valid JSON object — no markdown, no explanation.

Severity rubric (pick exactly one):
  P0: data loss, security exposure, credential leak, or core feature regression that would page an on-call engineer.
  P1: high-volume user frustration, missing functionality users expected to work, performance regressions.
  P2: broadly noted annoyance, edge-case bugs, intermittent issues.
  P3: single-user nitpick, feature request, question, cosmetic issue.

Response schema (JSON only):
{
  "themes": ["array", "of", "short", "theme", "labels"],
  "severity": "P0|P1|P2|P3",
  "is_actionable": true|false,
  "one_line_summary": "one sentence, 140 chars max"
}`;

const ClassificationResponseSchema = z.object({
  themes:           z.array(z.string()).min(1).max(10),
  severity:         z.enum(["P0", "P1", "P2", "P3"]),
  is_actionable:    z.boolean(),
  one_line_summary: z.string().max(140),
});

type ClassificationResponse = z.infer<typeof ClassificationResponseSchema>;

const FALLBACK_CLASSIFICATION = (postId: string, rawResponse: string): Classification => ({
  post_id:         postId,
  themes:          ["unparseable"],
  severity:        "P3" as Severity,
  sev_band:        "SEV2" as SevBand,
  is_actionable:   false,
  one_line_summary: "Classification failed; raw response archived for review.",
  cluster_id:      null,
  raw_response:    rawResponse,
  classified_at:   new Date().toISOString(),
});

/** Send a single classification request to Ollama. Returns the raw body text. */
async function callOllama(body: string, temperature: number): Promise<string> {
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system",    content: SYSTEM_PROMPT },
        { role: "user",      content: body },
      ],
      stream: false,
      options: { temperature },
      ...(temperature === 0 ? { format: "json" } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama HTTP ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as { message?: { content?: string } };
  return json.message?.content ?? "";
}

/** Parse the raw Ollama response into a ClassificationResponse, or return null. */
function tryParse(raw: string): ClassificationResponse | null {
  try {
    // Strip markdown fences if the model wrapped the JSON.
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(stripped) as unknown;
    return ClassificationResponseSchema.parse(parsed);
  } catch {
    return null;
  }
}

/**
 * Classify a single post via Ollama. Retries once at temperature 0 and
 * format:json on parse failure. Returns a fallback P3 classification if
 * both attempts fail — the pipeline never blocks on a single bad row.
 */
export async function classify(req: ClassifyRequest): Promise<Classification> {
  // Attempt 1: temperature 0.3 for natural-language quality.
  const raw1 = await callOllama(req.body, 0.3).catch(() => "");
  const parsed1 = tryParse(raw1);
  if (parsed1) {
    return buildClassification(req.postId, parsed1, raw1);
  }

  // Attempt 2: temperature 0, format:json to force structured output.
  const raw2 = await callOllama(req.body, 0).catch(() => "");
  const parsed2 = tryParse(raw2);
  if (parsed2) {
    return buildClassification(req.postId, parsed2, raw2);
  }

  // Fallback — never block the pipeline.
  return FALLBACK_CLASSIFICATION(req.postId, raw1 || raw2);
}

function buildClassification(
  postId: string,
  parsed: ClassificationResponse,
  rawResponse: string,
): Classification {
  const sevBandMap: Record<Severity, SevBand> = {
    P0: "SEV0",
    P1: "SEV1",
    P2: "SEV1",
    P3: "SEV2",
  };
  return {
    post_id:         postId,
    themes:          parsed.themes,
    severity:        parsed.severity,
    sev_band:        sevBandMap[parsed.severity],
    is_actionable:   parsed.is_actionable,
    one_line_summary: parsed.one_line_summary.slice(0, 140),
    cluster_id:      null,   // filled in by pipeline after clustering
    raw_response:    rawResponse,
    classified_at:   new Date().toISOString(),
  };
}
