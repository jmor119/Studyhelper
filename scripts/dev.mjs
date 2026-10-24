// Local development: Firebase emulators + functions watch build + Vite dev server.
import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';
const procs = [
  ['functions', 'npm', ['run', 'build:watch', '-w', 'functions']],
  ['emulators', 'npm', ['run', 'emulators']],
  ['web', 'npm', ['run', 'dev', '-w', 'apps/web']],
];

const children = procs.map(([name, cmd, args]) => {
  const child = spawn(cmd, args, { shell: isWin, env: { ...process.env, FORCE_COLOR: '1' } });
  const prefix = `[${name}] `;
  const pipe = (stream, out) =>
    stream.on('data', (buf) => out.write(buf.toString().replace(/^(?=.)/gm, prefix)));
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => console.log(`${prefix}exited with code ${code}`));
  return child;
});

const shutdown = () => {
  for (const child of children) child.kill('SIGINT');
  setTimeout(() => process.exit(0), 3000);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
