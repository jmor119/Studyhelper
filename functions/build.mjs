// Bundles the functions (and @study-helper/shared) into lib/index.js. Runtime dependencies listed in
// package.json stay external and are installed by Cloud Build at deploy time.
import { build, context } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies ?? {}).flatMap((d) => [d, `${d}/*`]);

const options = {
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external,
  logLevel: 'info',
  // Some CommonJS code inside the bundle expects `require`.
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
};

if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
