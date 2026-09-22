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
// Canonical database schema — bundled as a raw string at build time so the
// dashboard's "Copy Tables SQL" button always matches supabase/schema.sql.
import schemaSql from "../supabase/schema.sql?raw";

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

  /**
   * Resolve the Supabase Auth user id (auth.uid()) for the current session.
   * Returns null when nobody is signed in to Supabase Auth. All table
   * writes MUST be scoped to this id — the RLS policies in
   * supabase/schema.sql check `auth.uid() = user_id`.
   */
  async getAuthUserId() {
    const client = await this.init();
    if (!client) return null;
    try {
      const { data } = await client.auth.getSession();
      const session = data && data.session;
      return session && session.user ? session.user.id : null;
    } catch (e) {
      return null;
    }
  },

  // Record submission into Supabase table 'problem_submissions'.
  // Append-only by policy: owner can INSERT, never UPDATE/DELETE.
  // Requires a Supabase Auth session; otherwise the caller should fall
  // back to local storage (problems-data.js already does).
  async recordSubmission(submission) {
    const client = await this.init();
    if (!client) return null;

    const authUserId = await this.getAuthUserId();
    if (!authUserId) {
      console.info("[Kredora] recordSubmission skipped: no Supabase Auth session (RLS requires auth.uid() = user_id).");
      return null;
    }

    try {
      const { data, error } = await client
        .from("problem_submissions")
        .insert([{
          user_id: authUserId,
          problem_id: String(submission.problemId || "unknown"),
          language: String(submission.language || "javascript"),
          code: typeof submission.code === "string" ? submission.code : null,
          status: String(submission.status || "submitted"),
          runtime: submission.runtime != null ? String(submission.runtime) : null,
          memory: submission.memory != null ? String(submission.memory) : null,
          passed_tests: Number.isFinite(Number(submission.passedTests)) ? Number(submission.passedTests) : 0,
          total_tests: Number.isFinite(Number(submission.totalTests)) ? Number(submission.totalTests) : 0
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

  // Sync solved progress map to Supabase table 'user_progress'.
  // The `userId` argument is the app-local identity (display purposes
  // only); the ROW identity is always auth.uid() — enforced by RLS.
  async syncProgress(userId, solvedMap) {
    const client = await this.init();
    if (!client || !userId) return null;

    const authUserId = await this.getAuthUserId();
    if (!authUserId) {
      console.info("[Kredora] syncProgress skipped: no Supabase Auth session (RLS requires auth.uid() = user_id).");
      return null;
    }

    try {
      const { data, error } = await client
        .from("user_progress")
        .upsert([{
          user_id: authUserId,
          solved_data: solvedMap || {},
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

  // Load progress from Supabase for the CURRENT auth user. The userId
  // parameter is kept for API compatibility; RLS restricts results to
  // auth.uid() regardless of what is passed.
  async loadProgress(userId) {
    const client = await this.init();
    if (!client) return null;

    const authUserId = await this.getAuthUserId();
    if (!authUserId) return null;

    try {
      const { data, error } = await client
        .from("user_progress")
        .select("solved_data")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (error || !data) return null;
      return data.solved_data;
    } catch (e) {
      return null;
    }
  },

  // The full RLS schema (tables, policies, public view, indexes).
  // Served from supabase/schema.sql verbatim — see that file for docs.
  getSchemaSQL() {
    return schemaSql;
  },

  /**
   * Read the public portfolio view for one developer.
   * profile_summaries is the ONLY anon-readable surface (see schema.sql):
   * display name, headline, solved counts, score — never emails or code.
   * Returns { data, error } from a single select.
   */
  async getPublicProfile(profileId) {
    const client = await this.init();
    if (!client || !profileId) return { data: null, error: null };
    try {
      return await client
        .from("profile_summaries")
        .select("profile_id, display_name, headline, problems_solved, total_submissions, skill_score, last_active_at")
        .eq("profile_id", profileId)
        .maybeSingle();
    } catch (e) {
      return { data: null, error: e };
    }
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
      const { data: sessionData, error: authErr } = await client.auth.getSession();
      const latencyMs = Math.max(1, Date.now() - start);
      const authedUser = sessionData && sessionData.session ? sessionData.session.user : null;

      const subRes = await client.from("problem_submissions").select("id").limit(1);
      const progRes = await client.from("user_progress").select("user_id").limit(1);

      // PGRST205 = relation missing -> schema not applied yet.
      const subMissing = subRes.error && subRes.error.code === "PGRST205";
      const progMissing = progRes.error && progRes.error.code === "PGRST205";

      let projectUrl = "";
      try { projectUrl = new URL(url).hostname; } catch (e) { /* keep empty */ }

      // RLS in supabase/schema.sql makes base tables invisible to anon and
      // owner-only for authenticated users. An empty (0-row) result is the
      // EXPECTED healthy state, not a failure — distinguish it from errors.
      const hasSession = Boolean(authedUser);
      const subOk = !subRes.error;
      const progOk = !progRes.error;

      return {
        ok: true,
        configured: true,
        latencyMs,
        authOk: !authErr,
        authed: hasSession,
        projectUrl,
        rlsActive: true,
        tables: {
          problem_submissions: subOk,
          problem_submissions_error: subRes.error ? subRes.error.message : null,
          problem_submissions_rows_visible: subRes.data ? subRes.data.length : 0,
          user_progress: progOk,
          user_progress_error: progRes.error ? progRes.error.message : null,
          user_progress_rows_visible: progRes.data ? progRes.data.length : 0
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
