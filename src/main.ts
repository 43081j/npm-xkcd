import 'q5';
import {computeRects} from './data.js';
import {getLockFile, installPackage} from './container.js';
import {XKCD} from './xkcd.js';

async function run() {
  await installPackage('vite');
  const lockfile = await getLockFile();
  const data = await computeRects(lockfile);
  const instance = new q5('xkcd');
  const xkcd = new XKCD(instance, data);

  (instance as typeof instance & {setup: unknown}).setup = xkcd.setup;
  instance.draw = xkcd.draw;
}

run();
