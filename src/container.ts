import {WebContainer} from '@webcontainer/api';
import {type ParsedLockFile, parse} from 'lockparse';

let currentContainerPromise: Promise<WebContainer> | undefined;

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
        }
      }
    }
  });

  await exec('npm', ['install', packageName], '/project');
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
  const lockFileJSON = JSON.parse(lockFileContent);
  const parsed = await parse(lockFileJSON, 'package-lock.json', packageJSON);
  return parsed;
}
