/**
 * Kredora — Supabase Client Module (single source of database config)
 *
 * Credentials are compiled in at build time from VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY (environment variables / GitHub Actions secrets —
 * Vite inlines import.meta.env.* during `vite build`). Users may still
 * connect their own project at runtime via the Problem page modal, which
 * stores overrides in localStorage.
 *
 * Exposed as window.SupabaseDB for the inline page scripts.
 */

import { createClient } from "@supabase/supabase-js";

const BUILD_URL = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const BUILD_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

const SupabaseDB = {
  client: null,
  isInitialized: false,

  // Build-time env values, overridden by localStorage when the user
  // connects their own Supabase project from the UI.
  getConfig() {
    let url = BUILD_URL;
    let anonKey = BUILD_KEY;
    try {
      url = localStorage.getItem("skillproof_supabase_url") || BUILD_URL;
      anonKey = localStorage.getItem("skillproof_supabase_key") || BUILD_KEY;
    } catch (e) {
      /* storage unavailable — build values only */
    }
    return { url: String(url).trim(), anonKey: String(anonKey).trim() };
  },

  isConfigured() {
    const { url, anonKey } = this.getConfig();
    return Boolean(url && anonKey && url.startsWith("https://"));
  },

  async init() {
    if (this.isInitialized) return this.client;
    const { url, anonKey } = this.getConfig();
    if (!url || !anonKey) {
      return null;
    }

    try {
      this.client = createClient(url, anonKey);
      this.isInitialized = true;
      console.log("[Kredora] Connected to Supabase Database successfully.");
      return this.client;
    } catch (err) {
      console.warn("[Kredora] Supabase initialization warning:", err);
      return null;
    }
  },

  // Record submission into Supabase table 'problem_submissions'
  async recordSubmission(submission) {
    const client = await this.init();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from("problem_submissions")
        .insert([{
          problem_id: submission.problemId,
          user_id: submission.userId || "anonymous",
          language: submission.language,
          code: submission.code,
          status: submission.status,
          runtime: submission.runtime,
          memory: submission.memory,
          passed_tests: submission.passedTests,
          total_tests: submission.totalTests,
          submitted_at: new Date().toISOString()
        }]);

      if (error) {
        console.warn("[Kredora] Supabase recordSubmission warning:", error.message);
        return null;
      }
      return data;
    } catch (e) {
      console.warn("[Kredora] Supabase recordSubmission exception:", e);
      return null;
    }
  },

  // Sync solved progress map to Supabase table 'user_progress'
  async syncProgress(userId, solvedMap) {
    const client = await this.init();
    if (!client || !userId) return null;

    try {
      const { data, error } = await client
        .from("user_progress")
        .upsert([{
          user_id: userId,
          solved_data: solvedMap,
          updated_at: new Date().toISOString()
        }], { onConflict: "user_id" });

      if (error) {
        console.warn("[Kredora] Supabase syncProgress warning:", error.message);
        return null;
      }
      return data;
    } catch (e) {
      console.warn("[Kredora] Supabase syncProgress exception:", e);
      return null;
    }
  },

  // Load progress from Supabase
  async loadProgress(userId) {
    const client = await this.init();
    if (!client || !userId) return null;

    try {
      const { data, error } = await client
        .from("user_progress")
        .select("solved_data")
        .eq("user_id", userId)
        .single();

      if (error || !data) return null;
      return data.solved_data;
    } catch (e) {
      return null;
    }
  },

  // Get SQL script to set up tables and RLS in Supabase
  getSchemaSQL() {
    return `-- ==================================================================
-- Kredora Supabase Database Tables & Security Policies
-- Paste into Supabase Dashboard -> SQL Editor -> Run
-- ==================================================================

-- 1. Table for problem submissions
create table if not exists public.problem_submissions (
  id uuid default gen_random_uuid() primary key,
  problem_id text not null,
  user_id text not null,
  language text,
  code text,
  status text,
  runtime text,
  memory text,
  passed_tests int,
  total_tests int,
  submitted_at timestamptz default now()
);

-- Enable RLS and add public access policies for submissions
alter table public.problem_submissions enable row level security;

drop policy if exists "Allow insert for submissions" on public.problem_submissions;
create policy "Allow insert for submissions"
  on public.problem_submissions for insert
  with check (true);

drop policy if exists "Allow select for submissions" on public.problem_submissions;
create policy "Allow select for submissions"
  on public.problem_submissions for select
  using (true);

-- 2. Table for user solved progress
create table if not exists public.user_progress (
  user_id text primary key,
  solved_data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Enable RLS and add policies for user progress
alter table public.user_progress enable row level security;

drop policy if exists "Allow read user progress" on public.user_progress;
create policy "Allow read user progress"
  on public.user_progress for select
  using (true);

drop policy if exists "Allow upsert user progress" on public.user_progress;
create policy "Allow upsert user progress"
  on public.user_progress for all
  using (true)
  with check (true);`;
  },

  // Lightweight, fully client-side connectivity check:
  // auth round-trip + one small select per table, with latency.
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        ok: false,
        configured: false,
        message: "Supabase is not configured. Set the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY build secrets, or connect a project from the Problem page."
      };
    }

    const { url } = this.getConfig();
    try {
      const client = await this.init();
      if (!client) {
        return { ok: false, configured: true, error: "Supabase client could not be initialized." };
      }

      const start = Date.now();
      const { error: authErr } = await client.auth.getSession();
      const latencyMs = Math.max(1, Date.now() - start);

      const subRes = await client.from("problem_submissions").select("id").limit(1);
      const progRes = await client.from("user_progress").select("user_id").limit(1);

      const subMissing = subRes.error && subRes.error.code === "PGRST205";
      const progMissing = progRes.error && progRes.error.code === "PGRST205";

      let projectUrl = "";
      try { projectUrl = new URL(url).hostname; } catch (e) { /* keep empty */ }

      return {
        ok: true,
        configured: true,
        latencyMs,
        authOk: !authErr,
        projectUrl,
        tables: {
          problem_submissions: !subRes.error,
          problem_submissions_error: subRes.error ? subRes.error.message : null,
          user_progress: !progRes.error,
          user_progress_error: progRes.error ? progRes.error.message : null
        },
        schemaNeeded: subMissing || progMissing
      };
    } catch (err) {
      return {
        ok: false,
        configured: true,
        error: err.message
      };
    }
  }
};

window.SupabaseDB = SupabaseDB;

export default SupabaseDB;
