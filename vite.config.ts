import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig} from 'vite';

// Deployed under GitHub Pages at https://<owner>.github.io/Kredora/
export const BASE_PATH = '/Kredora/';

export default defineConfig(() => {
  return {
    base: BASE_PATH,
    plugins: [
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          login: path.resolve(__dirname, 'login.html'),
          signup: path.resolve(__dirname, 'signup.html'),
          dashboard: path.resolve(__dirname, 'dashboard.html'),
          evidence: path.resolve(__dirname, 'evidence.html'),
          profile: path.resolve(__dirname, 'profile.html'),
          skill: path.resolve(__dirname, 'skill.html'),
          problems: path.resolve(__dirname, 'problems.html'),
          problem: path.resolve(__dirname, 'problem.html'),
          privacy: path.resolve(__dirname, 'privacy.html'),
          terms: path.resolve(__dirname, 'terms.html'),
        },
      },
    },
  };
});
