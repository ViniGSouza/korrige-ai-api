import { tscPlugin } from 'esbuild-plugin-tsc';

export default {
  plugins: [
    tscPlugin({
      force: true,
    }),
  ],
  bundle: true,
  minify: false,
  sourcemap: true,
  exclude: ['aws-sdk'],
  target: 'node22',
  platform: 'node',
  concurrency: 10,
  format: 'esm',
  banner: {
    js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
  },
};
