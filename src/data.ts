import type {ResolvedTree} from './resolver.js';

function sizeToPixels(bytes: number): number {
  return Math.max(10, Math.sqrt(bytes / 1000));
}

export function computeRects(
  tree: ResolvedTree
): Array<[number, number, number, number, string]> {
  const {sizes, depths} = tree;

  // deepest dependencies first; skip packages with no known size
  const nodes = [...depths.entries()]
    .filter(([key]) => sizes.has(key))
    .sort((a, b) => b[1] - a[1]);
  const pixelSizes = nodes.map(([key]) =>
    Math.round(sizeToPixels(sizes.get(key)!))
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
