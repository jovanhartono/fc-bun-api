await Bun.build({
  entrypoints: ['./server/index.ts'],
  env: 'disable',
  minify: true,
  outdir: './dist',
  splitting: true,
  target: 'bun',
});

export {};
