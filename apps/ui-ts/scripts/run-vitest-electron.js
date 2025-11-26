// Run Vitest using Electron's Node runtime so native addons (e.g., better-sqlite3)
// match the Electron ABI used by `npm start`.
const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

const vitestPkg = require.resolve('vitest/package.json');
const vitestEntry = path.resolve(vitestPkg, '..', 'vitest.mjs');
const vitestArgs = process.argv.slice(2);

const child = spawn(electron, [vitestEntry, ...vitestArgs], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
});

child.on('error', (err) => {
  console.error('Failed to launch Vitest via Electron:', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Vitest terminated with signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
