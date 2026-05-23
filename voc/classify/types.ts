// voc/classify/types.ts — schema mirror of voc/ingest/models.py
// Keep in lock-step with the Pydantic models on main. If you change one, change the other.

export type Source = "forum" | "reddit" | "hn" | "github" | "harness";

export interface Post {
  id: string;                  // sha1(source + ":" + source_id), 16 chars
  source: Source;
  source_id: string;
  url: string;
  title: string;
  body: string;
  author: string | null;
  posted_at: string;           // ISO 8601 UTC
  fetched_at: string;          // ISO 8601 UTC
  upvotes: number | null;
  reply_count: number | null;
  labels: string[];
  raw: Record<string, unknown>;
}

export type Severity = "P0" | "P1" | "P2" | "P3";
export type SevBand  = "SEV0" | "SEV1" | "SEV2";

export interface Classification {
  post_id: string;             // FK to Post.id
  themes: string[];
  severity: Severity;
  sev_band: SevBand;
  is_actionable: boolean;
  one_line_summary: string;    // ≤ 140 chars
  cluster_id: string | null;
  raw_response: string;        // archived model reply
  classified_at: string;       // ISO 8601 UTC
}

export interface Cluster {
  id: string;                  // stable centroid hash
  size: number;
  representative_post_id: string;
  summary: string | null;
  created_at: string;
}
