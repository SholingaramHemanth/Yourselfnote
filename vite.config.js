const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  plugins: [react()],
  root: 'client',
  server: { hmr: false },
  build: { outDir: '../dist', emptyOutDir: true },
});
