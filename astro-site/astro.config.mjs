import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://georgiahills.com',
  output: 'static',
  build: {
    format: 'file'
  }
});
