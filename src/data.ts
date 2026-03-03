import type {ParsedDependency, ParsedLockFile} from 'lockparse';
import {getPackageSizes} from './container.js';

function sizeToPixels(bytes: number): number {
  return Math.max(10, Math.sqrt(bytes / 1000));
}

export async function computeRects(
  lockFile: ParsedLockFile
): Promise<Array<[number, number, number, number, string]>> {
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

  nodes.reverse();

  const pixelSizes = nodes.map(({name, version}) =>
    sizeToPixels(sizes.get(`${name}@${version}`) ?? 0)
  );

  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);

  const rowHeights = new Array<number>(rows).fill(0);
  for (let i = 0; i < pixelSizes.length; i++) {
    const row = Math.floor(i / cols);
    rowHeights[row] = Math.max(rowHeights[row], pixelSizes[i]);
  }

  const rowY = new Array<number>(rows).fill(0);
  for (let r = 1; r < rows; r++) {
    rowY[r] = rowY[r - 1] + rowHeights[r - 1];
  }

  const rowX = new Array<number>(rows).fill(0);
  const rects: Array<[number, number, number, number, string]> = [];

  for (let i = 0; i < pixelSizes.length; i++) {
    const row = Math.floor(i / cols);
    const size = pixelSizes[i];
    const {name, version} = nodes[i];
    rects.push([rowX[row], rowY[row], size, size, `${name}@${version}`]);
    rowX[row] += size;
  }

  return rects;
}
