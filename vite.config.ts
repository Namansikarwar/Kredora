import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Copy the classic (non-module) scripts referenced by the pages into dist,
// since Vite does not bundle or emit plain <script src> files on its own.
const copyJsDir = () => ({
  name: 'copy-js-dir',
  apply: 'build' as const,
  closeBundle() {
    const src = path.resolve(__dirname, 'js');
    const out = path.resolve(__dirname, 'dist', 'js');
    fs.mkdirSync(out, {recursive: true});
    for (const f of fs.readdirSync(src)) {
      if (f.endsWith('.js')) fs.copyFileSync(path.join(src, f), path.join(out, f));
    }
  },
});

export default defineConfig(() => {
  return {
    plugins: [
      tailwindcss(),
      copyJsDir(),
      {
        name: 'supabase-env-inject',
        transformIndexHtml(html) {
          const supaUrl = process.env.VITE_SUPABASE_URL || '';
          const supaKey = process.env.VITE_SUPABASE_ANON_KEY || '';
          const script = `<script>window.ENV = window.ENV || {}; window.ENV.VITE_SUPABASE_URL = ${JSON.stringify(supaUrl)}; window.ENV.VITE_SUPABASE_ANON_KEY = ${JSON.stringify(supaKey)};</script>`;
          return html.replace('<head>', `<head>\n  ${script}`);
        },
        configureServer(server) {
          server.middlewares.use('/api/supabase-test', async (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            const url = process.env.VITE_SUPABASE_URL;
            const key = process.env.VITE_SUPABASE_ANON_KEY;
            if (!url || !key) {
              res.statusCode = 400;
              return res.end(JSON.stringify({
                ok: false,
                configured: false,
                message: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set in environment.'
              }));
            }

            try {
              const { createClient } = await import('@supabase/supabase-js');
              const supabase = createClient(url, key);
              const start = Date.now();
              const authRes = await supabase.auth.getSession();
              const latencyMs = Date.now() - start;

              const subRes = await supabase.from('problem_submissions').select('id').limit(1);
              const progRes = await supabase.from('user_progress').select('user_id').limit(1);

              const tables = {
                problem_submissions: !subRes.error,
                problem_submissions_error: subRes.error ? subRes.error.message : null,
                user_progress: !progRes.error,
                user_progress_error: progRes.error ? progRes.error.message : null
              };

              res.statusCode = 200;
              res.end(JSON.stringify({
                ok: true,
                configured: true,
                projectUrl: new URL(url).hostname,
                latencyMs,
                authOk: !authRes.error,
                tables,
                schemaNeeded: !tables.problem_submissions || !tables.user_progress
              }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({
                ok: false,
                configured: true,
                error: err.message
              }));
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
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
        },
      },
    },
  };
});
