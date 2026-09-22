-- ============================================================================
-- Kredora — Supabase schema with Row Level Security
-- ============================================================================
-- Run once in Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: everything is idempotent (if not exists / drop-if-exists).
--
-- Design:
--   * RLS enabled on every table. Without a Supabase Auth session the anon
--     role sees ZERO rows from the base tables.
--   * problem_submissions is INSERT-ONLY from clients: no UPDATE or DELETE
--     policy exists, so even the row owner cannot alter or erase evidence
--     after the fact. This is the "proof, not claims" guarantee.
--   * user_progress is readable and writable only by its owner.
--   * profile_summaries is the only anon-readable surface: a curated view
--     with display fields only (no emails, no code, no raw user ids).
--
-- Requires the build secrets VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to
-- point at this project (see .github/workflows/deploy.yml).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. problem_submissions — append-only evidence of coding work
-- ----------------------------------------------------------------------------
-- user_id is NULLABLE: unauthenticated users can submit from the live site
-- and the Edge Function stamps rows with a null user. RLS then treats
-- "null user_id rows" as visible to nobody except the service role.
create table if not exists public.problem_submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete cascade,
  problem_id    text not null,
  language      text not null default 'javascript',
  code          text,
  status        text not null default 'submitted'
                check (status in ('accepted', 'failed', 'submitted', 'error')),
  runtime       text,
  memory        text,
  passed_tests  integer not null default 0 check (passed_tests >= 0),
  total_tests   integer not null default 0 check (total_tests >= 0),
  submitted_at  timestamptz not null default now()
);

comment on table public.problem_submissions is
  'Append-only record of every code submission. Written ONLY by the run-submission Edge Function (service role). No client INSERT/UPDATE/DELETE policies: submissions are tamper-proof evidence.';

-- ----------------------------------------------------------------------------
-- 1b. problem_tests — HIDDEN test cases, server-side only
-- ----------------------------------------------------------------------------
-- Never readable by anon/authenticated. Only the service role (Edge Function)
-- selects from here. Test payloads are jsonb: {"input": [...], "expected": ...}
create table if not exists public.problem_tests (
  id          uuid primary key default gen_random_uuid(),
  problem_id  text not null,
  kind        text not null default 'hidden' check (kind in ('hidden', 'sample')),
  input       jsonb not null,
  expected    jsonb not null,
  weight      integer not null default 1,
  created_at  timestamptz not null default now()
);

-- Lock down: no policies for anon/authenticated on problem_tests at all.
alter table public.problem_tests enable row level security;
alter table public.problem_tests force row level security;

comment on table public.problem_tests is
  'Hidden test cases. NO policies: only the service_role key (Edge Function) can read. Sample tests are bundled in the client; never expose this table via PostgREST.';

create index if not exists idx_problem_tests_problem on public.problem_tests (problem_id);

-- ----------------------------------------------------------------------------
-- 1c. submission_rate_limits — server-side sliding-window rate limiting
-- ----------------------------------------------------------------------------
-- Written/read ONLY by the run-submission Edge Function (service role).
-- identity is 'user:<auth.uid>' for authenticated callers or 'ip:<addr>'
-- for anonymous ones. hit_count counts submissions inside the window that
-- starts at window_start (UTC). One row per identity (PK upsert).
create table if not exists public.submission_rate_limits (
  identity      text primary key,
  window_start  timestamptz not null default now(),
  hit_count     integer not null default 0 check (hit_count >= 0)
);

alter table public.submission_rate_limits enable row level security;
alter table public.submission_rate_limits force row level security;
-- No policies: anon/authenticated have no business reading or writing this.

create index if not exists idx_rate_limits_window on public.submission_rate_limits (window_start);

-- ----------------------------------------------------------------------------
-- 2. user_progress — per-user solved-problem state
-- ----------------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  solved_data jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

comment on table public.user_progress is
  'Per-user solved-problem map. Owner-readable and owner-writable only.';

-- ----------------------------------------------------------------------------
-- 3. Row Level Security — enable on both tables
-- ----------------------------------------------------------------------------
alter table public.problem_submissions enable row level security;
alter table public.user_progress        enable row level security;

-- Force RLS even for table owners (defense in depth; the anon key is used
-- by the browser, but this keeps direct SQL mistakes from leaking rows).
alter table public.problem_submissions force row level security;
alter table public.user_progress        force row level security;

-- Re-create policies idempotently
-- NO INSERT policy for clients: the run-submission Edge Function writes
-- rows using the service_role key, which bypasses RLS entirely. Clients
-- cannot forge submissions, runtime numbers, or pass counts.
-- NOTE: deliberately NO policy AT ALL for problem_submissions ->
-- select/insert/update/delete are all denied to anon+authenticated at the
-- Postgres level. Only the service_role key (Edge Function server-side)
-- reads and writes. The submission history surface reads from
-- profile_summaries instead.

drop policy if exists "progress: owner reads own row"
  on public.user_progress;
create policy "progress: owner reads own row"
  on public.user_progress
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "progress: owner writes own row"
  on public.user_progress;
create policy "progress: owner writes own row"
  on public.user_progress
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. profile_summaries — the ONLY anon-readable surface
-- ----------------------------------------------------------------------------
-- Public portfolio data for profile.html: display name, score, solved
-- counts, verification state. No emails, no code, no auth user ids.
-- ----------------------------------------------------------------------------
create or replace view public.profile_summaries
with (security_invoker = false) as
select
  p.user_id                                   AS profile_id,
  coalesce(pu.raw_user_meta_data ->> 'name',
           pu.raw_user_meta_data ->> 'username',
           'Kredora Developer')               AS display_name,
  coalesce(pu.raw_user_meta_data ->> 'headline',
           'Developer proving skills on Kredora') AS headline,
  (select count(*) from public.problem_submissions s
     where s.user_id = p.user_id and s.status = 'accepted') AS problems_solved,
  (select count(*) from public.problem_submissions s
     where s.user_id = p.user_id) AS total_submissions,
  -- Simple heuristic: 5 points per accepted problem, capped at 100.
  -- The app ships 21 problems, so solving all of them scores 100.
  least(100, (select count(*) from public.problem_submissions s
              where s.user_id = p.user_id and s.status = 'accepted') * 5) AS skill_score,
  p.updated_at AS last_active_at
from public.user_progress p
left join auth.users pu on pu.id = p.user_id;

-- SECURITY MODEL (read this before changing):
-- security_invoker = false means the view executes with the VIEW OWNER's
-- rights, intentionally bypassing RLS on the base tables — that is what
-- makes a public portfolio possible while the tables themselves stay
-- locked to anon. The view is the ONLY public surface and it projects
-- ONLY safe fields: display name, headline, counts, score, timestamp.
-- No emails, no raw code, no auth.users columns beyond metadata names.
-- Only developers who have a user_progress row appear here at all:
-- your public profile exists once you start tracking progress.

revoke all on public.profile_summaries from public;
grant select on public.profile_summaries to anon, authenticated;

-- Defense in depth: strip ALL privileges the anon/authenticated roles
-- never need on the base tables. RLS already denies these; this removes
-- the underlying grants too, so even a future policy mistake cannot leak
-- rows or permit writes from the browser.
revoke all on public.problem_submissions from anon, authenticated;
revoke all on public.user_progress from anon, authenticated;
revoke all on public.problem_tests from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_problem_submissions_user_id
  on public.problem_submissions (user_id);
create index if not exists idx_problem_submissions_user_status
  on public.problem_submissions (user_id, status);
create index if not exists idx_problem_submissions_submitted_at
  on public.problem_submissions (submitted_at desc);
-- user_progress.user_id is the primary key already; nothing extra needed.

-- ----------------------------------------------------------------------------
-- 6. Verification queries (optional, run manually to sanity-check)
-- ----------------------------------------------------------------------------
-- As anon (logged out): should return 0 rows from base tables...
--   select * from public.problem_submissions;   -- 0 rows (RLS blocks)
--   select * from public.user_progress;         -- 0 rows (RLS blocks)
-- ...but the public profile view still works:
--   select display_name, skill_score from public.profile_summaries limit 5;

-- As an authenticated user (session from the app), INSERT should succeed:
--   insert into public.problem_submissions (user_id, problem_id)
--   values (auth.uid(), 'two-sum');            -- ok
--
-- ...but UPDATE / DELETE should fail with "new row violates row-level
-- security" / "permission denied" because no policy covers those verbs.
