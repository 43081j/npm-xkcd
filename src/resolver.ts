import {getLatestVersionBatch} from 'fast-npm-meta';

interface VersionManifest {
  dependencies?: Record<string, string>;
  dist?: {unpackedSize?: number};
}

const REGISTRY = 'https://registry.npmjs.org';
const MAX_PACKAGES = 2000;
const FETCH_CONCURRENCY = 20;
const RESOLVE_BATCH_SIZE = 25;
const RESOLVE_BATCH_CONCURRENCY = 4;

export interface ResolvedTree {
  sizes: Map<string, number>;
  depths: Map<string, number>;
}

function packageUrl(name: string, version: string): string {
  return `${REGISTRY}/${name.replace('/', '%2F')}/${version}`;
}

function normalizeSpec(spec: string): string {
  const aliasAt = spec.indexOf('@', 1);
  if (aliasAt > 0 && spec.startsWith('npm:', aliasAt + 1)) {
    spec = spec.slice(aliasAt + 1 + 'npm:'.length);
  }

  const at = spec.lastIndexOf('@');
  if (at <= 0) return spec;
  const name = spec.slice(0, at);
  const range = spec
    .slice(at + 1)
    .replace(/(\S+)\s+-\s+(\S+)/g, '>=$1 <=$2')
    .replace(/\s*\|\|\s*/g, '||')
    .replace(/\s+(?=[<>=~^])/g, '');
  return `${name}@${range}`;
}

async function fetchManifest(
  name: string,
  version: string
): Promise<VersionManifest | undefined> {
  const res = await fetch(packageUrl(name, version));
  if (!res.ok) return undefined;
  return (await res.json()) as VersionManifest;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(
    Array.from({length: Math.min(limit, items.length)}, worker)
  );
  return out;
}

export async function resolveTree(rootPackage: string): Promise<ResolvedTree> {
  const sizes = new Map<string, number>();
  const depths = new Map<string, number>();
  const visited = new Set<string>();

  const [rootResolved] = await getLatestVersionBatch([
    normalizeSpec(rootPackage)
  ]);
  if (!rootResolved.version) return {sizes, depths};

  let sizeQueue: Array<[string, string]> = [
    [rootResolved.name, rootResolved.version]
  ];
  depths.set(`${rootResolved.name}@${rootResolved.version}`, 0);

  for (let depth = 0; sizeQueue.length > 0; depth++) {
    if (visited.size >= MAX_PACKAGES) break;

    const manifests = await mapWithConcurrency(
      sizeQueue,
      FETCH_CONCURRENCY,
      async ([name, version]) => {
        const key = `${name}@${version}`;
        if (visited.has(key)) return undefined;
        visited.add(key);
        try {
          const m = await fetchManifest(name, version);
          if (m?.dist?.unpackedSize !== undefined) {
            sizes.set(key, m.dist.unpackedSize);
          }
          return m;
        } catch {
          return undefined;
        }
      }
    );

    const specs = new Set<string>();
    for (const m of manifests) {
      if (!m?.dependencies) continue;
      for (const [name, range] of Object.entries(m.dependencies)) {
        specs.add(normalizeSpec(`${name}@${range}`));
      }
    }
    if (specs.size === 0) break;

    const specList = [...specs];
    const chunks: string[][] = [];
    for (let j = 0; j < specList.length; j += RESOLVE_BATCH_SIZE) {
      chunks.push(specList.slice(j, j + RESOLVE_BATCH_SIZE));
    }
    const resolvedChunks = await mapWithConcurrency(
      chunks,
      RESOLVE_BATCH_CONCURRENCY,
      (chunk) => getLatestVersionBatch(chunk)
    );
    const resolved = resolvedChunks.flat();

    const next: Array<[string, string]> = [];
    for (const r of resolved) {
      if (!r.version) continue;
      const key = `${r.name}@${r.version}`;
      if (!depths.has(key)) depths.set(key, depth + 1);
      if (!visited.has(key)) next.push([r.name, r.version]);
    }
    sizeQueue = next;
  }

  return {sizes, depths};
}
