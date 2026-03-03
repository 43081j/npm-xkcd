import 'q5';
import {computeRects} from './data.js';
import {getLockFile, installPackage} from './container.js';
import {XKCD} from './xkcd.js';

const form = document.getElementById('pkg-form') as HTMLFormElement;
const input = document.getElementById('pkg-input') as HTMLInputElement;
const button = form.querySelector('button') as HTMLButtonElement;
const formContainer = document.getElementById(
  'form-container'
) as HTMLDivElement;
const xkcdContainer = document.getElementById('xkcd') as HTMLDivElement;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pkg = input.value.trim();
  if (!pkg) return;

  button.disabled = true;
  button.textContent = 'Loading...';

  await installPackage(pkg);
  const lockfile = await getLockFile();
  const data = await computeRects(lockfile);

  formContainer.style.display = 'none';
  xkcdContainer.style.display = '';

  const instance = new q5('xkcd');
  const xkcd = new XKCD(instance, data);
  (instance as typeof instance & {setup: unknown}).setup = xkcd.setup;
  instance.draw = xkcd.draw;
});
