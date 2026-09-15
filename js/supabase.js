/**
 * SkillProof Supabase Database Integration
 * Connects problem solving submissions, user accounts, and progress tracking
 * to Supabase PostgreSQL database when credentials are provided.
 */

(function () {
  const SupabaseDB = {
    client: null,
    isInitialized: false,

    // Get config from window.ENV or localStorage
    getConfig() {
      const winEnv = (typeof window !== "undefined" && window.ENV) ? window.ENV : {};
      const url = winEnv.VITE_SUPABASE_URL ||
                  (typeof localStorage !== "undefined" && localStorage.getItem("skillproof_supabase_url")) || "";
      const anonKey = winEnv.VITE_SUPABASE_ANON_KEY ||
                      (typeof localStorage !== "undefined" && localStorage.getItem("skillproof_supabase_key")) || "";
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
        if (window.supabase && typeof window.supabase.createClient === "function") {
          this.client = window.supabase.createClient(url, anonKey);
          this.isInitialized = true;
          console.log("[SkillProof] Connected to Supabase Database successfully.");
          return this.client;
        }
      } catch (err) {
        console.warn("[SkillProof] Supabase initialization warning:", err);
      }
      return null;
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
          console.warn("[SkillProof] Supabase recordSubmission warning:", error.message);
          return null;
        }
        return data;
      } catch (e) {
        console.warn("[SkillProof] Supabase recordSubmission exception:", e);
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
          console.warn("[SkillProof] Supabase syncProgress warning:", error.message);
          return null;
        }
        return data;
      } catch (e) {
        console.warn("[SkillProof] Supabase syncProgress exception:", e);
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
-- SkillProof Supabase Database Tables & Security Policies
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

    // Comprehensive test of connection and table status
    async testConnection() {
      try {
        const resp = await fetch("/api/supabase-test");
        if (resp.ok) {
          const data = await resp.json();
          return data;
        }
      } catch (e) {
        // Fallback to client-side test
      }

      const client = await this.init();
      if (!client) {
        return {
          ok: false,
          configured: false,
          message: "Supabase client could not be initialized. Missing URL or Anon Key."
        };
      }

      try {
        const start = Date.now();
        const { error: authErr } = await client.auth.getSession();
        const latencyMs = Date.now() - start;

        const subRes = await client.from("problem_submissions").select("id").limit(1);
        const progRes = await client.from("user_progress").select("user_id").limit(1);

        const subMissing = subRes.error && subRes.error.code === "PGRST205";
        const progMissing = progRes.error && progRes.error.code === "PGRST205";

        return {
          ok: true,
          configured: true,
          latencyMs,
          authOk: !authErr,
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
})();
