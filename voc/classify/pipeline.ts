import { createReadStream, createWriteStream } from "node:fs";
import * as readline from "node:readline";

import pino from "pino";

import { classify } from "./ollama_client.js";
import { cluster, embed, type ClusterInput } from "./cluster.js";
import type { Classification, Post } from "./types.js";

const logger = pino({ name: "voc-classify", level: process.env["LOG_LEVEL"] ?? "info" });

/**
 * Read raw posts from `input` (one JSON Post per line), classify each via
 * Ollama, run embedding-based DBSCAN clustering, then write one
 * Classification+clusterId per line to `output`.
 *
 * Called from the Makefile's `voc-classify` target.
 */
export async function runClassification(input: string, output: string): Promise<void> {
  logger.info({ input, output }, "voc-classify: starting");

  // ── Read all posts ────────────────────────────────────────────────────────
  const posts: Post[] = [];
  const rl = readline.createInterface({
    input: createReadStream(input, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      posts.push(JSON.parse(trimmed) as Post);
    } catch (err) {
      logger.warn({ line: trimmed.slice(0, 80), err }, "skipping unparseable line");
    }
  }
  logger.info({ count: posts.length }, "posts loaded");

  // ── Classify ──────────────────────────────────────────────────────────────
  const classifications: Classification[] = [];
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]!;
    logger.debug({ postId: post.id, i, total: posts.length }, "classifying");
    try {
      const result = await classify({ postId: post.id, body: post.body, source: post.source });
      classifications.push(result);
    } catch (err) {
      logger.error({ postId: post.id, err }, "classify error — using fallback");
      classifications.push({
        post_id: post.id, themes: ["classify_error"], severity: "P3", sev_band: "SEV2",
        is_actionable: false, one_line_summary: "Classification error; see logs.",
        cluster_id: null, raw_response: String(err), classified_at: new Date().toISOString(),
      });
    }
  }
  logger.info({ count: classifications.length }, "classification complete");

  // ── Embed ─────────────────────────────────────────────────────────────────
  logger.info("embedding posts for clustering");
  const clusterInputs: ClusterInput[] = [];
  for (const post of posts) {
    try {
      const embedding = await embed(post.body.slice(0, 2000));
      clusterInputs.push({ postId: post.id, embedding });
    } catch (err) {
      logger.warn({ postId: post.id, err }, "embed failed; post will be noise");
    }
  }

  // ── Cluster ───────────────────────────────────────────────────────────────
  const clusters = cluster(clusterInputs);
  logger.info({ clusterCount: clusters.length }, "clustering complete");

  // Build postId → clusterId map.
  const clusterMap = new Map<string, string>();
  for (const c of clusters) {
    for (const pid of c.postIds) clusterMap.set(pid, c.clusterId);
  }

  // Attach cluster_id to classifications.
  for (const cls of classifications) {
    cls.cluster_id = clusterMap.get(cls.post_id) ?? null;
  }

  // ── Write output ──────────────────────────────────────────────────────────
  const writer = createWriteStream(output, { encoding: "utf8" });
  for (const cls of classifications) {
    writer.write(JSON.stringify(cls) + "\n");
  }
  await new Promise<void>((resolve, reject) => {
    writer.end((err?: Error | null) => (err ? reject(err) : resolve()));
  });

  logger.info({ output, written: classifications.length }, "voc-classify: done");
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith("pipeline.ts") || process.argv[1]?.endsWith("pipeline.js")) {
  const [, , inputArg, outputArg] = process.argv;
  if (!inputArg || !outputArg) {
    process.stderr.write("usage: tsx voc/classify/pipeline.ts <input.jsonl> <output.jsonl>\n");
    process.exit(1);
  }
  await runClassification(inputArg, outputArg);
}
