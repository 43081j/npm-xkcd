import 'q5';
import {computeRects} from './data.js';
import {resolveTree} from './resolver.js';
import {XKCD} from './xkcd.js';

const form = document.getElementById('pkg-form') as HTMLFormElement;
const input = document.getElementById('pkg-input') as HTMLInputElement;
const button = form.querySelector('button') as HTMLButtonElement;
const header = document.getElementById('header') as HTMLDivElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const siteTitle = document.getElementById('site-title') as HTMLHeadingElement;
const xkcdContainer = document.getElementById('xkcd') as HTMLDivElement;

function setStatus(text: string) {
  statusEl.textContent = text;
}

let activeXkcd: XKCD | null = null;

async function loadPackage(pkg: string) {
  button.disabled = true;
  button.textContent = 'Loading...';
  header.classList.add('loading');

  setStatus(`Resolving ${pkg}...`);
  const tree = await resolveTree(pkg);

  setStatus('Computing layout...');
  const data = computeRects(tree);

  siteTitle.textContent = `xkcd: ${pkg}`;
  header.classList.remove('loading');

  activeXkcd?.destroy();

  // Create canvas first so its height is in the layout before transitions start
  const instance = new q5('xkcd', xkcdContainer);
  const xkcd = new XKCD(instance, data);
  activeXkcd = xkcd;
  (instance as typeof instance & {setup: unknown}).setup = xkcd.setup;
  instance.draw = xkcd.draw;

  document.body.classList.add('has-image');
  setStatus('');
  button.disabled = false;
  button.textContent = 'xkcd-ify';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pkg = input.value.trim();
  if (!pkg) return;

  history.pushState(null, '', `?q=${encodeURIComponent(pkg)}`);
  await loadPackage(pkg);
});

window.addEventListener('popstate', () => {
  const pkg = new URLSearchParams(location.search).get('q');
  if (pkg) {
    input.value = pkg;
    loadPackage(pkg);
  } else {
    // Back to home — show the form
    activeXkcd?.destroy();
    activeXkcd = null;
    document.body.classList.remove('has-image');
    siteTitle.textContent = 'xkcd';
    button.disabled = false;
    button.textContent = 'xkcd-ify';
    input.value = '';
  }
});

const initialPkg = new URLSearchParams(location.search).get('q');
if (initialPkg) {
  input.value = initialPkg;
  loadPackage(initialPkg);
}
