import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/avatar/',
  resolve: {
    alias: {
      '@avatar': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3002,
    host: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          babylonjs: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/serializers'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/serializers'],
  },
  assetsInclude: ['**/*.glb', '**/*.vrm', '**/*.env'],
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __VERSION__: JSON.stringify('0.1.0'),
  },
});
