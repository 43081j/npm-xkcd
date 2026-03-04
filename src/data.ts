import type {ParsedDependency, ParsedLockFile} from 'lockparse';
import {getPackageSizes} from './container.js';

function sizeToPixels(bytes: number): number {
  return Math.max(10, Math.sqrt(bytes / 1000));
}

function computeDepths(lockFile: ParsedLockFile): Map<string, number> {
  const depths = new Map<string, number>();

  function visit(dep: ParsedDependency, depth: number, path: Set<string>) {
    const key = `${dep.name}@${dep.version}`;
    if (path.has(key)) return;
    if ((depths.get(key) ?? -1) >= depth) return;
    depths.set(key, depth);
    path.add(key);
    for (const child of dep.dependencies) {
      visit(child, depth + 1, path);
    }
    path.delete(key);
  }

  for (const dep of lockFile.root.dependencies) {
    visit(dep, 0, new Set());
  }

  return depths;
}

export async function computeRects(
  lockFile: ParsedLockFile
): Promise<Array<[number, number, number, number, string]>> {
  const sizes = await getPackageSizes();
  const depths = computeDepths(lockFile);

  // deepest dependencies first
  const nodes = [...depths.entries()].sort((a, b) => b[1] - a[1]);
  const pixelSizes = nodes.map(([key]) =>
    Math.round(sizeToPixels(sizes.get(key) ?? 0))
  );

  const totalArea = pixelSizes.reduce((sum, s) => sum + s * s, 0);
  const canvasW = Math.round(Math.sqrt(totalArea) * 0.9);

  const skyline = new Array<number>(canvasW).fill(0);
  const center = canvasW / 2;

  const rects: Array<[number, number, number, number, string]> = [];

  for (let i = 0; i < nodes.length; i++) {
    const [key] = nodes[i];
    const s = pixelSizes[i];
    const w = Math.min(s, canvasW);

    let bestX = 0;
    let bestY = Infinity;
    let bestDist = Infinity;

    for (let x = 0; x <= canvasW - w; x++) {
      let y = 0;
      for (let col = x; col < x + w; col++) {
        if (skyline[col] > y) y = skyline[col];
      }
      const dist = Math.abs(x + w / 2 - center);
      if (y < bestY || (y === bestY && dist < bestDist)) {
        bestX = x;
        bestY = y;
        bestDist = dist;
      }
    }

    rects.push([bestX, bestY, w, s, key]);

    const newH = bestY + s;
    for (let col = bestX; col < bestX + w; col++) {
      skyline[col] = newH;
    }
  }

  return rects;
}
