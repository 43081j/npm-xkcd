import type {ParsedDependency, ParsedLockFile} from 'lockparse';
import {getPackageSizes} from './container.js';

function sizeToPixels(bytes: number): number {
  return Math.max(10, Math.sqrt(bytes / 1000));
}

export async function computeRects(
  lockFile: ParsedLockFile
): Promise<Array<[number, number, number, number]>> {
  const sizes = await getPackageSizes();
  const seen = new Set<string>();
  const nodes: Array<{name: string; version: string}> = [];
  const queue: ParsedDependency[] = [lockFile.root];

  while (queue.length > 0) {
    const node = queue.shift()!;
    const key = `${node.name}@${node.version}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    nodes.push({name: node.name, version: node.version});

    for (const dep of node.dependencies) {
      queue.push(dep);
    }
  }

  const pixelSizes = nodes.map(({name, version}) =>
    sizeToPixels(sizes.get(`${name}@${version}`) ?? 0)
  );

  const cols = Math.ceil(Math.sqrt(nodes.length));

  const colMaxWidths = new Array<number>(cols).fill(0);
  for (let i = 0; i < pixelSizes.length; i++) {
    const col = i % cols;
    colMaxWidths[col] = Math.max(colMaxWidths[col], pixelSizes[i]);
  }

  const colX = new Array<number>(cols).fill(0);
  for (let c = 1; c < cols; c++) {
    colX[c] = colX[c - 1] + colMaxWidths[c - 1];
  }

  const colBottoms = new Array<number>(cols).fill(0);
  const rects: Array<[number, number, number, number]> = [];

  for (let i = 0; i < pixelSizes.length; i++) {
    const col = i % cols;
    const size = pixelSizes[i];
    rects.push([colX[col], colBottoms[col], size, size]);
    colBottoms[col] += size;
  }

  return rects;
}
