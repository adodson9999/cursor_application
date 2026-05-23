import { createHash } from "node:crypto";

export interface ClusterInput {
  postId: string;
  embedding: number[];
}

export interface Cluster {
  clusterId: string;
  postIds: string[];
  representativePostId: string;
  size: number;
}

const OLLAMA_HOST = process.env["OLLAMA_HOST"] ?? "http://localhost:11434";
const EMBED_MODEL = process.env["OLLAMA_EMBED_MODEL"] ?? "nomic-embed-text";

/** Fetch an embedding vector from Ollama for the given text. */
export async function embed(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });
  if (!response.ok) {
    throw new Error(`Ollama embeddings HTTP ${response.status}: ${await response.text()}`);
  }
  const json = (await response.json()) as { embedding?: number[] };
  if (!json.embedding?.length) {
    throw new Error("Ollama returned empty embedding vector");
  }
  return json.embedding;
}

/** Cosine distance in [0, 1]. 0 = identical, 1 = orthogonal. */
function cosineDist(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot  += (a[i] ?? 0) * (b[i] ?? 0);
    magA += (a[i] ?? 0) * (a[i] ?? 0);
    magB += (b[i] ?? 0) * (b[i] ?? 0);
  }
  if (magA === 0 || magB === 0) return 1.0;
  return 1 - dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * DBSCAN-style density clustering on cosine distance.
 * Pure TypeScript — no external ML library.
 *
 * @param items     PostId + embedding pairs to cluster.
 * @param opts.minSize    Minimum cluster size (default 3).
 * @param opts.threshold  Max cosine distance to be considered a neighbour (default 0.25).
 */
export function cluster(
  items: ClusterInput[],
  opts: { minSize?: number; threshold?: number } = {},
): Cluster[] {
  const minSize = opts.minSize ?? 3;
  const threshold = opts.threshold ?? 0.25;
  const n = items.length;

  // -1 = unvisited, -2 = noise, ≥0 = cluster id
  const labels = new Array<number>(n).fill(-1);

  const getNeighbours = (idx: number): number[] => {
    const nbrs: number[] = [];
    for (let j = 0; j < n; j++) {
      if (j !== idx && cosineDist(items[idx]!.embedding, items[j]!.embedding) <= threshold) {
        nbrs.push(j);
      }
    }
    return nbrs;
  };

  let nextId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;
    const nbrs = getNeighbours(i);

    if (nbrs.length + 1 < minSize) {
      labels[i] = -2; // noise
      continue;
    }

    const cid = nextId++;
    labels[i] = cid;

    const seeds = [...nbrs];
    while (seeds.length > 0) {
      const seed = seeds.shift()!;
      if (labels[seed] === -2) labels[seed] = cid;
      if (labels[seed] !== -1) continue;
      labels[seed] = cid;
      const seedNbrs = getNeighbours(seed);
      if (seedNbrs.length + 1 >= minSize) seeds.push(...seedNbrs);
    }
  }

  // Group indices by cluster id.
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const cid = labels[i];
    if (cid !== undefined && cid >= 0) {
      if (!groups.has(cid)) groups.set(cid, []);
      groups.get(cid)!.push(i);
    }
  }

  const clusters: Cluster[] = [];
  for (const [, indices] of groups) {
    if (indices.length === 0) continue;
    const clusterItems = indices.map((i) => items[i]!);
    const representativeIdx = findRepresentative(clusterItems);
    const clusterId = stableCentroidHash(clusterItems.map((it) => it.embedding));

    clusters.push({
      clusterId,
      postIds: clusterItems.map((it) => it.postId),
      representativePostId: clusterItems[representativeIdx]!.postId,
      size: clusterItems.length,
    });
  }

  return clusters;
}

/**
 * Find the index of the item with the smallest mean cosine distance to all
 * other items in the cluster (i.e., the medoid / representative point).
 */
function findRepresentative(items: ClusterInput[]): number {
  if (items.length === 1) return 0;
  let bestIdx = 0;
  let bestMeanDist = Infinity;

  for (let i = 0; i < items.length; i++) {
    let totalDist = 0;
    for (let j = 0; j < items.length; j++) {
      if (i !== j) totalDist += cosineDist(items[i]!.embedding, items[j]!.embedding);
    }
    const mean = totalDist / (items.length - 1);
    if (mean < bestMeanDist) {
      bestMeanDist = mean;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Compute a stable 12-char hex hash from a set of embedding vectors.
 * Used as a deterministic cluster ID — same set of vectors → same hash.
 */
function stableCentroidHash(embeddings: number[][]): string {
  const dim = embeddings[0]?.length ?? 0;
  const centroid = new Array<number>(dim).fill(0);
  for (const emb of embeddings) {
    for (let d = 0; d < dim; d++) centroid[d]! += (emb[d] ?? 0) / embeddings.length;
  }
  const payload = centroid.map((v) => v.toFixed(6)).join(",");
  return createHash("sha1").update(payload).digest("hex").slice(0, 12);
}
