// Runs a command with a Java 21+ runtime on PATH (the Firebase emulators need one).
// Uses `java` from PATH or JAVA_HOME if suitable, otherwise the newest JDK 21+ found in ~/.jdks.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

function javaMajor(javaBin) {
  const res = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
  const out = `${res.stderr ?? ''}${res.stdout ?? ''}`;
  const match = out.match(/version "(\d+)/);
  return match ? Number(match[1]) : 0;
}

function findJavaBinDir() {
  if (javaMajor('java') >= 21) return null; // already fine
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(path.join(process.env.JAVA_HOME, 'bin'));
  const jdks = path.join(homedir(), '.jdks');
  if (existsSync(jdks)) {
    for (const dir of readdirSync(jdks)) candidates.push(path.join(jdks, dir, 'bin'));
  }
  const usable = candidates
    .map((bin) => ({ bin, major: javaMajor(path.join(bin, 'java')) }))
    .filter((c) => c.major >= 21)
    .sort((a, b) => a.major - b.major); // prefer the oldest LTS that satisfies 21+
  if (!usable.length) {
    console.error('No Java 21+ runtime found. Install one (e.g. Eclipse Temurin 21) or set JAVA_HOME.');
    process.exit(1);
  }
  return usable[0].bin;
}

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('usage: node scripts/with-java.mjs <command> [...args]');
  process.exit(1);
}
const binDir = findJavaBinDir();
// The functions emulator gives up loading code after 10 s by default, which a busy machine can exceed.
const env = { FUNCTIONS_DISCOVERY_TIMEOUT: '60', ...process.env };
if (binDir) {
  const key = Object.keys(env).find((k) => k.toLowerCase() === 'path') ?? 'PATH';
  env[key] = `${binDir}${path.delimiter}${env[key] ?? ''}`;
  env.JAVA_HOME = path.dirname(binDir);
}
// On Windows the command runs through the shell (firebase is a .cmd), so re-quote arguments with spaces.
const isWin = process.platform === 'win32';
const quoted = isWin ? args.map((a) => (/\s/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)) : args;
const child = spawn(cmd, quoted, { stdio: 'inherit', env, shell: isWin });
child.on('exit', (code) => process.exit(code ?? 1));
