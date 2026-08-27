import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = resolve(frontendDirectory, 'dist');
const backendPublicDirectory = resolve(frontendDirectory, '..', 'backend', 'public');
const managedEntries = new Set(['assets', 'favicon.svg', 'index.html', 'og.png']);
const requiredEntries = ['assets', 'index.html'];

function assertManagedPath(path) {
  const relativePath = relative(backendPublicDirectory, path);

  if (relativePath.startsWith('..') || relativePath === '') {
    throw new Error(`Refusing to modify a path outside backend/public: ${path}`);
  }
}

if (!existsSync(distDirectory)) {
  throw new Error('Cannot deploy frontend: frontend/dist does not exist.');
}

const distEntries = readdirSync(distDirectory);
const unexpectedEntries = distEntries.filter((entry) => !managedEntries.has(entry));

if (unexpectedEntries.length > 0) {
  throw new Error(`Cannot deploy unmanaged frontend entries: ${unexpectedEntries.join(', ')}`);
}

for (const entry of requiredEntries) {
  if (!distEntries.includes(entry)) {
    throw new Error(`Cannot deploy frontend: frontend/dist/${entry} is missing.`);
  }
}

mkdirSync(backendPublicDirectory, { recursive: true });

for (const entry of managedEntries) {
  const targetPath = resolve(backendPublicDirectory, entry);
  assertManagedPath(targetPath);
  rmSync(targetPath, { recursive: true, force: true });
}

for (const entry of distEntries) {
  const targetPath = resolve(backendPublicDirectory, entry);
  assertManagedPath(targetPath);
  cpSync(resolve(distDirectory, entry), targetPath, { recursive: true });
}
