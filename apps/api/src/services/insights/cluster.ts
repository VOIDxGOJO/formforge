import { seededRandom } from '../../engine/model.js';

// k-means on sentence embeddings with k chosen by silhouette score (report Section 4.1.11).
// Vectors are L2-normalised first, so squared Euclidean distance tracks cosine distance.

export type Clustering = { k: number; assignment: number[]; silhouette: number; centres: number[][] };

const normalise = (v: number[]) => {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
};

const dist = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i]! - b[i]!) ** 2;
  return s;
};

/** k-means++ initialisation followed by Lloyd iterations. */
export const kMeans = (points: number[][], k: number, random: () => number, iterations = 50) => {
  const centres: number[][] = [points[Math.floor(random() * points.length)]!];
  while (centres.length < k) {
    const d = points.map((p) => Math.min(...centres.map((c) => dist(p, c))));
    const total = d.reduce((a, b) => a + b, 0);
    let r = random() * total;
    let next = d.findIndex((x) => (r -= x) <= 0);
    if (next < 0) next = points.length - 1;
    centres.push(points[next]!);
  }
  let assignment = points.map(() => 0);
  for (let it = 0; it < iterations; it++) {
    const nextAssignment = points.map((p) => {
      let best = 0;
      for (let c = 1; c < k; c++) if (dist(p, centres[c]!) < dist(p, centres[best]!)) best = c;
      return best;
    });
    const changed = nextAssignment.some((a, i) => a !== assignment[i]);
    assignment = nextAssignment;
    for (let c = 0; c < k; c++) {
      const members = points.filter((_, i) => assignment[i] === c);
      if (members.length === 0) continue; // keep an empty centre where it is
      centres[c] = members[0]!.map((_, j) => members.reduce((s, m) => s + m[j]!, 0) / members.length);
    }
    if (!changed && it > 0) break;
  }
  return { assignment, centres };
};

/** Mean silhouette over all points, given a precomputed distance matrix. */
export const silhouette = (distances: number[][], assignment: number[], k: number) => {
  let total = 0;
  for (let i = 0; i < assignment.length; i++) {
    const sums = new Array<number>(k).fill(0);
    const counts = new Array<number>(k).fill(0);
    for (let j = 0; j < assignment.length; j++) {
      if (i === j) continue;
      sums[assignment[j]!]! += Math.sqrt(distances[i]![j]!);
      counts[assignment[j]!]!++;
    }
    const own = assignment[i]!;
    if (counts[own] === 0) continue; // singleton: silhouette 0
    const a = sums[own]! / counts[own]!;
    let b = Infinity;
    for (let c = 0; c < k; c++) if (c !== own && counts[c]! > 0) b = Math.min(b, sums[c]! / counts[c]!);
    if (Number.isFinite(b)) total += (b - a) / Math.max(a, b);
  }
  return total / assignment.length;
};

/** Tries k = 2..maxK and keeps the best silhouette. Returns null when there are too few points. */
export const clusterEmbeddings = (vectors: number[][], maxK = 8, seed = 7): Clustering | null => {
  const n = vectors.length;
  const upper = Math.min(maxK, Math.floor(n / 3));
  if (upper < 2) return null;
  const points = vectors.map(normalise);
  const distances = points.map((p) => points.map((q) => dist(p, q)));
  let best: Clustering | null = null;
  for (let k = 2; k <= upper; k++) {
    const { assignment, centres } = kMeans(points, k, seededRandom(seed + k));
    const score = silhouette(distances, assignment, k);
    if (!best || score > best.silhouette) best = { k, assignment, silhouette: score, centres };
  }
  return best;
};

/** Indices of the members of cluster `c`, closest to its centre first. */
export const closestToCentre = (vectors: number[][], clustering: Clustering, c: number) => {
  const centre = clustering.centres[c]!;
  return clustering.assignment
    .map((a, i) => ({ a, i, d: dist(normalise(vectors[i]!), centre) }))
    .filter((x) => x.a === c)
    .sort((x, y) => x.d - y.d)
    .map((x) => x.i);
};
