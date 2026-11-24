/**
 * `next dev` / `next start` with the port taken from `.env`.
 *
 * Next loads `.env` for the app, but resolves the port from the CLI flag or the process env
 * before that — so `OP_PORT` in `.env` would otherwise be ignored. Node's own loader fixes it.
 *
 *   node scripts/next.mjs dev|start [...args]
 */
import './load-env.mjs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const [mode, ...rest] = process.argv.slice(2);
// OP_PORT is the project's name for it; PORT is honoured because hosts inject it.
const port = process.env.OP_PORT ?? process.env.PORT ?? '5002';

// Run Next's entry through node rather than the `next` shim on PATH: Windows `spawn` has no
// PATHEXT lookup, so it cannot find `next.cmd` and fails with ENOENT.
const next = createRequire(import.meta.url).resolve('next/dist/bin/next');

const child = spawn(process.execPath, [next, mode, '--port', port, ...rest], {
  stdio: 'inherit',
  env: process.env,
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
