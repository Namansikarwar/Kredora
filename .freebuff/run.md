# Kredora — Run Doc

Static multi-page site (plain HTML/CSS/JS + Tailwind CDN) served by Vite.

## 1. Reproduce the artifacts

1. Install dependencies with npm (the lockfile present is `package-lock.json`; a legacy `bun.lock` also exists but npm is what the dev script is driven with here):

   ```
   npm install --no-audit --no-fund
   ```

2. Environment files: none are required to run. `.env.example` documents optional Supabase keys; the app falls back to localStorage when they are absent. If a future checkout needs real keys, copy `.env.local` from the main checkout — never commit its values.

## 2. Run the dev server

- Script: `npm run dev` → `vite --port=3000 --host=0.0.0.0`
- URL: `http://localhost:3000/` (entry `index.html`; other pages are siblings: `dashboard.html`, `problems.html`, `problem.html`, `evidence.html`, `skill.html`, `profile.html`, `login.html`, `signup.html`)
- Port 3000 is the project default. If taken, pass `-- --port=<free>` instead of adapting files.

### Detached start (Windows, Freebuff preview recipe)

```
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'C:\Users\naman\Downloads\Kredora' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```

- stdout and stderr MUST point at different files or PowerShell fails.
- Heads-up: the bash tool call can time out at ~30s because Start-Process keeps console handles open, but the process still starts. Verify with `curl http://localhost:3000/index.html` and `Get-Process -Id <pid>` rather than trusting the exit.
- Find the PID later: `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | Where-Object { $_.CommandLine -match 'vite' } | Select-Object ProcessId"` (escape `$_` as `\$_` when calling PowerShell from bash).

## Notes

- Demo login (client-side seeded account): username `demo`, password `password123`. Dashboard pages are auth-gated in JS, not by the server.
- `npm run lint` runs `tsc --noEmit` over the `src/` TS files; the site pages themselves are not typechecked.
- Tailwind loads from the CDN with an inline config per page; console shows a "should not be used in production" warning — expected, not an error.
