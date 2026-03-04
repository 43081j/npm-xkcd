import {WebContainer} from '@webcontainer/api';
import {type ParsedLockFile, parse} from 'lockparse';

let currentContainerPromise: Promise<WebContainer> | undefined;

export async function bootContainer(): Promise<void> {
  await getContainer();
}

async function getContainer(): Promise<WebContainer> {
  if (!currentContainerPromise) {
    currentContainerPromise = WebContainer.boot();
    try {
      const container = await currentContainerPromise;
      return container;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  return currentContainerPromise;
}

const GET_SIZES_SCRIPT = /* js */ `
import {readdirSync, statSync, readFileSync} from 'fs';

function dirSize(dir) {
  try {
    let total = 0;
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      if (entry.name === 'node_modules') continue;
      const p = dir + '/' + entry.name;
      total += entry.isDirectory() ? dirSize(p) : statSync(p).size;
    }
    return total;
  } catch {
    return 0;
  }
}

function scan(nm, sizes) {
  try {
    for (const entry of readdirSync(nm, {withFileTypes: true})) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('@')) {
        for (const pkg of readdirSync(nm + '/' + entry.name, {withFileTypes: true})) {
          if (pkg.isDirectory()) register(nm + '/' + entry.name + '/' + pkg.name, sizes);
        }
      } else {
        register(nm + '/' + entry.name, sizes);
      }
    }
  } catch {}
}

function register(pkgDir, sizes) {
  try {
    const {name, version} = JSON.parse(readFileSync(pkgDir + '/package.json', 'utf8'));
    sizes[name + '@' + version] = dirSize(pkgDir);
    scan(pkgDir + '/node_modules', sizes);
  } catch {}
}

const sizes = {};
scan('project/node_modules', sizes);
console.log(JSON.stringify(sizes));
`;

async function exec(cmd: string, args: string[], cwd: string) {
  const container = await getContainer();
  const proc = await container.spawn(cmd, args, {cwd});

  await proc.exit;

  return proc;
}

function generatePackageJson(packageName: string): string {
  const packageJson = {
    name: 'temp',
    version: '1.0.0',
    type: 'module',
    private: true,
    dependencies: {
      [packageName]: 'latest'
    }
  };

  return JSON.stringify(packageJson, null, 2);
}

export async function installPackage(packageName: string): Promise<void> {
  const cwd = '/project';
  const container = await getContainer();

  try {
    await container.fs.rm(cwd, {recursive: true, force: true});
  } catch {
    // Ignore errors for now
  }

  await container.mount({
    project: {
      directory: {
        'package.json': {
          file: {
            contents: generatePackageJson(packageName)
          }
        },
        'get-sizes.mjs': {
          file: {contents: GET_SIZES_SCRIPT}
        }
      }
    }
  });

  await exec('npm', ['install', packageName], '/project');
}

async function execOutput(cmd: string, args: string[]): Promise<string> {
  const container = await getContainer();
  const proc = await container.spawn(cmd, args);
  let output = '';
  await Promise.all([
    proc.output.pipeTo(
      new WritableStream({
        write(chunk) {
          output += chunk;
        }
      })
    ),
    proc.exit
  ]);
  return output;
}

export async function getPackageSizes(): Promise<Map<string, number>> {
  const output = await execOutput('node', ['project/get-sizes.mjs']);
  const json: Record<string, number> = JSON.parse(output);
  return new Map(Object.entries(json));
}

export async function getLockFile(): Promise<ParsedLockFile> {
  const container = await getContainer();
  const lockFileContent = await container.fs.readFile(
    '/project/package-lock.json',
    'utf-8'
  );
  const packageJSONContent = await container.fs.readFile(
    '/project/package.json',
    'utf-8'
  );
  const packageJSON = JSON.parse(packageJSONContent);
  const parsed = await parse(lockFileContent, 'package-lock.json', packageJSON);
  return parsed;
}
