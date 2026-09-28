-- ============================================================================
-- Kredora — Supabase schema with Row Level Security
-- ============================================================================
-- Run once in Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: everything is idempotent (if not exists / drop-if-exists).
--
-- Design:
--   * RLS enabled on every table. Without a Supabase Auth session the anon
--     role sees ZERO rows from the base tables.
--   * problem_submissions has NO client policies at all: no INSERT, UPDATE,
--     or DELETE. Only the run-submission Edge Function (service role) writes
--     rows, so the browser cannot forge submissions, verdicts, or counts.
--     Accepted rows are hash-chained (see record_hash below) so that edits
--     or deletions AFTER the fact can be detected by anyone holding a
--     record id. This is tamper-EVIDENT, not tamper-PROOF: it does not
--     protect against someone who can rewrite the whole database.
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
-- user_id is ALWAYS set: submissions require an authenticated Supabase
-- session — the Edge Function stamps every row with the JWT-derived user id
-- and rejects anonymous callers. There is no anonymous submission path.
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
  submitted_at          timestamptz not null default now(),
  -- Hash chain v2 (accepted submissions only — computed by the Edge
  -- Function; the browser can never choose or alter any of these fields):
  --   code_hash   = sha256(source code), pinned separately from the record
  --   tests_summary = compact pass/fail map, chained with the verdict
  --   record_hash = sha256(canonical json of {code_hash, language,
  --     passed_tests, previous_record_hash, problem_id, status,
  --     submitted_at, tests_summary, total_tests, user_id})
  -- previous_record_hash links to the user's previous ACCEPTED row ("") for
  -- the first one. submitted_at is stamped by the DATABASE (default now())
  -- and the hash PINS the exact value the row carries, so a later clock edit
  -- also breaks the chain. The hash is computed from the same DB-returned
  -- row the evidence stores — never from a separate in-memory timestamp.
  -- Verifying (verify-record) recomputes the whole chain: any edit to a
  -- chained field, any deletion inside the chain, or any reordering makes
  -- every later link fail. It does NOT protect against a full database
  -- rewrite by someone with service-role/DBA access, and it is not a
  -- certificate of correctness — only of what was recorded.
  code_hash             text,
  tests_summary         text,
  record_version        integer not null default 2,
  record_hash           text,
  previous_record_hash  text
);

-- Append-only enforcement for the normal client (defense in depth on top of
-- the missing grants below): authenticated users have no UPDATE or DELETE
-- policy, so "new row violates row-level security" / permission-denied is
-- the expected result for any client-side mutation attempt. The service
-- role (Edge Functions) is the ONLY writer.
comment on table public.problem_submissions is
  'Append-only record of every code submission. Written ONLY by the run-submission Edge Function (service role). No client INSERT/UPDATE/DELETE policies. Accepted rows carry a sha256 hash chained to the user''s previous accepted row (record_hash/previous_record_hash) so post-hoc edits or deletions are detectable via the verify-record function. Tamper-evident, NOT tamper-proof: does not protect against full rewrites by the service role or a DBA, and hashes pin recorded content, not correctness.';

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
-- 1c-2. Atomic sliding-window rate limiter (fail-closed, race-safe)
-- ----------------------------------------------------------------------------
-- The Edge Function previously did read-then-upsert (a race under concurrent
-- requests) and silently FAILED OPEN on any database error — a limiter outage
-- meant unlimited submissions. Both fixed here:
--
--   * consume_rate_limit() is ONE atomic statement: the counter increment and
--     the limit check happen inside the same UPDATE ... WHERE ... RETURNING,
--     using the DATABASE clock (now()). No client-supplied timestamps or
--     counters are ever consulted — there are no parameters for them.
--   * The function is SECURITY DEFINER and intentionally executable ONLY by
--     the service role (no grants to anon/authenticated), so the check cannot
--     be bypassed, reset, or probed from a browser, regardless of RLS.
--   * Any error surfaces as an exception -> the Edge Function FAILS CLOSED
--     (rejects the submission). A broken limiter never grants unlimited use.
--   * Sliding window: on first hit inside a fresh window, window_start resets
--     to now(); the window the caller is compared against is always
--     [now() - window_seconds, now()].
--   * Limits are CONFIGURATION, not code: submission_rate_limit_config rows
--     (per-identity kind) are read inside the same atomic call. Seeded
--     defaults below; override per environment without redeploying.
create or replace function public.consume_rate_limit(
  p_identity     text,
  p_kind         text,            -- 'user' | 'ip'
  p_limit        integer default null,
  p_window_s     integer default null
)
returns table (allowed boolean, current_hits integer, limit_value integer, retry_after_s integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit        integer;
  v_window_s     integer;
  v_new_count    integer;
  v_window_start timestamptz;
begin
  -- Resolve configuration: explicit args (service-role caller) win, else the
  -- per-kind config row, else the 'default' row, else built-in fallbacks.
  select coalesce(p_limit, r.limit_value, 20),
         coalesce(p_window_s, r.window_seconds, 60)
    into v_limit, v_window_s
    from public.submission_rate_limit_config r
    where r.kind = p_kind;

  v_limit    := coalesce(v_limit, 20);
  v_window_s := greatest(1, coalesce(v_window_s, 60));

  -- Single atomic statement against the DATABASE clock. Returns the row only
  -- when the increment was permitted; returns no row when the limit is hit.
  update public.submission_rate_limits
     set hit_count = case
           when window_start < now() - make_interval(secs => v_window_s)
             or window_start is null
           then 1                                   -- fresh window
           else hit_count + 1 end,
         window_start = case
           when window_start < now() - make_interval(secs => v_window_s)
             or window_start is null
           then now()                               -- restart the window
           else window_start end
   where identity = p_identity
     and (
       window_start < now() - make_interval(secs => v_window_s)
       or window_start is null
       or hit_count < v_limit                        -- still inside the limit
     )
  returning hit_count, window_start into v_new_count, v_window_start;

  if found then
    return query select true, v_new_count, v_limit,
      greatest(0, ceil(extract(epoch from
        (v_window_start + make_interval(secs => v_window_s)) - now()))::integer);
    return;
  end if;

  -- No row updated: either the limit is hit, or this identity has no row yet.
  -- Insert the first row atomically; a concurrent duplicate loses the race
  -- gracefully (ON CONFLICT DO NOTHING) and re-checks against the winner.
  insert into public.submission_rate_limits (identity, window_start, hit_count)
  values (p_identity, now(), 1)
  on conflict (identity) do nothing;

  if found then
    return query select true, 1, v_limit,
      v_window_s::integer;
    return;
  end if;

  -- Lost the insert race -> someone else created the row concurrently.
  -- Re-read under the new window state and decide against it.
  select window_start, hit_count into v_window_start, v_new_count
    from public.submission_rate_limits where identity = p_identity;
  if v_window_start < now() - make_interval(secs => v_window_s) then
    -- Stale window (should be rare); admit conservatively and restart.
    update public.submission_rate_limits
       set hit_count = 1, window_start = now()
     where identity = p_identity;
    return query select true, 1, v_limit, v_window_s::integer;
  elsif v_new_count < v_limit then
    update public.submission_rate_limits
       set hit_count = hit_count + 1
     where identity = p_identity;
    return query select true, v_new_count + 1, v_limit,
      greatest(0, ceil(extract(epoch from
        (v_window_start + make_interval(secs => v_window_s)) - now()))::integer);
  else
    return query select false, v_new_count, v_limit,
      greatest(0, ceil(extract(epoch from
        (v_window_start + make_interval(secs => v_window_s)) - now()))::integer);
  end if;
end;
$$;

-- Service role ONLY: the browser must not be able to call the limiter,
-- reset counters, or probe remaining quota. Revoking from PUBLIC (the
-- default grant) strips anon/authenticated AND service_role, so the service
-- role gets an explicit grant back — the Edge Function is the sole caller.
revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to service_role;

-- Per-kind limit configuration (reads use the definer's rights, inside the
-- function). Seeded defaults; update rows to tune without redeploying.
create table if not exists public.submission_rate_limit_config (
  kind           text primary key,
  limit_value    integer not null check (limit_value > 0),
  window_seconds integer not null check (window_seconds > 0)
);

insert into public.submission_rate_limit_config (kind, limit_value, window_seconds) values
  ('user', 20, 60),      -- per authenticated user: 20 submissions / minute
  ('ip',   60, 60)       -- per client IP (secondary anti-abuse layer)
on conflict (kind) do nothing;

alter table public.submission_rate_limit_config enable row level security;
alter table public.submission_rate_limit_config force row level security;
revoke all on public.submission_rate_limit_config from anon, authenticated;

comment on function public.consume_rate_limit(text, text, integer, integer) is
  'Atomic sliding-window rate limiter for submissions. Uses the database clock only (no client-supplied timestamps/counters), single-statement increment+check for concurrency safety, per-kind configurable limits, executable by the service role only. Callers must fail closed on error.';

-- ----------------------------------------------------------------------------
-- 1d. problems — the AUTHORITATIVE problem record (server-side)
-- ----------------------------------------------------------------------------
-- The browser's problem list (js/problems-data.js) is for DISPLAY only and is
-- never trusted: the run-submission Edge Function validates every submission
-- against THIS table. A problem id that does not exist here with active =
-- true cannot be graded, no matter what the client sends. The difficulty and
-- points stored here are the server-side values used for any scoring — the
-- client-sent difficulty/score/test-count are ignored by design.
create table if not exists public.problems (
  id          text primary key,
  title       text not null,
  difficulty  text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  points      integer not null default 2 check (points >= 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Zero policies: anon/authenticated have NO direct access. Browsing stays on
-- the client bundle; this table is the grading authority, read only by the
-- run-submission Edge Function with the service role.
alter table public.problems enable row level security;
alter table public.problems force row level security;

create index if not exists idx_problems_active on public.problems (active);

comment on table public.problems is
  'Authoritative problem registry. run-submission validates problem existence and language support against this table (service-role read); the client catalog is display-only. No policies: inaccessible to anon/authenticated.';

-- Seed / re-sync: keep in sync with js/problems-data.js (display-only list).
-- Idempotent: re-running updates title/difficulty/points, never duplicates.
insert into public.problems (id, title, difficulty, points) values
  ('two-sum', 'Two Sum', 'Easy', 2),
  ('valid-palindrome', 'Valid Palindrome', 'Easy', 2),
  ('valid-parentheses', 'Valid Parentheses', 'Easy', 2),
  ('maximum-subarray', 'Maximum Subarray', 'Medium', 4),
  ('container-with-most-water', 'Container With Most Water', 'Medium', 4),
  ('longest-substring-without-repeating-characters', 'Longest Substring Without Repeating Characters', 'Medium', 4),
  ('climbing-stairs', 'Climbing Stairs', 'Easy', 2),
  ('trapping-rain-water', 'Trapping Rain Water', 'Hard', 8),
  ('binary-search', 'Binary Search', 'Easy', 2),
  ('coin-change', 'Coin Change', 'Medium', 4),
  ('valid-anagram', 'Valid Anagram', 'Easy', 2),
  ('reverse-linked-list', 'Reverse Linked List', 'Easy', 2),
  ('binary-tree-inorder-traversal', 'Binary Tree Inorder Traversal', 'Easy', 2),
  ('maximum-depth-of-binary-tree', 'Maximum Depth of Binary Tree', 'Easy', 2),
  ('intersection-of-two-arrays', 'Intersection of Two Arrays', 'Easy', 2),
  ('fibonacci-number', 'Fibonacci Number', 'Easy', 2),
  ('single-number', 'Single Number', 'Easy', 2),
  ('move-zeroes', 'Move Zeroes', 'Easy', 2),
  ('plus-one', 'Plus One', 'Easy', 2),
  ('contains-duplicate', 'Contains Duplicate', 'Easy', 2)
on conflict (id) do update
  set title = excluded.title,
      difficulty = excluded.difficulty,
      points = excluded.points;

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
-- NO INSERT/UPDATE/DELETE grant or policy for clients: the run-submission
-- Edge Function writes rows with the service_role key (bypasses RLS), so the
-- browser can never forge, alter, or remove a submission — including its own
-- VERIFIED evidence. Clients may only SELECT their own rows (policy below;
-- the SELECT grant is restored in section 5's defense-in-depth block).

-- Re-create policies idempotently
-- NO INSERT/UPDATE/DELETE policy for clients: the run-submission Edge
-- Function writes rows using the service_role key, which bypasses RLS
-- entirely. Clients cannot forge submissions, runtime numbers, or counts.
-- SELECT: an authenticated user may read their OWN rows (user_id =
-- auth.uid()). This backs the shared user-stats module (streak, verified
-- points, solved counts) and the evidence page's submission records.
-- Anon gets nothing; nobody can read another user's rows.

drop policy if exists "submissions: owner reads own rows"
  on public.problem_submissions;
create policy "submissions: owner reads own rows"
  on public.problem_submissions
  for select to authenticated
  using (auth.uid() = user_id);

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
  -- Distinct problems accepted (re-solving the same problem does not
  -- inflate the score). Matches js/user-stats.js solvedTotal so the
  -- profile page and client-side computation always agree.
  (select count(distinct s.problem_id) from public.problem_submissions s
     where s.user_id = p.user_id and s.status = 'accepted') AS problems_solved,
  (select count(*) from public.problem_submissions s
     where s.user_id = p.user_id) AS total_submissions,
  -- Simple heuristic: 5 points per accepted problem, capped at 100.
  -- The app ships 20 problems, so solving all of them scores 100.
  least(100, (select count(distinct s.problem_id) from public.problem_submissions s
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
-- Writes are fully revoked first: no INSERT/UPDATE/DELETE grant exists for
-- anon/authenticated, so the append-only guarantee holds at the grant layer.
-- The owner-SELECT grant is then RESTORED (after the revoke — order matters):
-- the "submissions: owner reads own rows" policy depends on it, and without
-- the grant every read fails with "permission denied" (this broke the
-- user-stats/evidence client reads).
revoke all on public.problem_submissions from anon, authenticated;
grant select on public.problem_submissions to authenticated;
revoke all on public.user_progress from anon, authenticated;
revoke all on public.problem_tests from anon, authenticated;
revoke all on public.submission_rate_limits from anon, authenticated;
revoke all on public.problems from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_problem_submissions_user_id
  on public.problem_submissions (user_id);
create index if not exists idx_problem_submissions_user_status
  on public.problem_submissions (user_id, status);
create index if not exists idx_problem_submissions_submitted_at
  on public.problem_submissions (submitted_at desc);
-- Chain walk order for verify-record (per-user, oldest first):
create index if not exists idx_problem_submissions_user_time
  on public.problem_submissions (user_id, submitted_at);
-- user_progress.user_id is the primary key already; nothing extra needed.

-- ----------------------------------------------------------------------------
-- 5b. Evidence-chain integrity (defense in depth, DB-enforced)
-- ----------------------------------------------------------------------------
-- The Edge Functions already compute hashes correctly; these constraints make
-- whole classes of tampering IMPOSSIBLE at the storage layer, not merely
-- detectable by verify-record afterwards:
--
--   * accepted rows MUST carry a complete v2 chain (record_hash, code_hash,
--     tests_summary, previous_record_hash all non-null) — an accepted row can
--     never silently lack verifiable evidence, even if the Edge Function
--     crashed between insert and chain-stamp.
--   * a non-accepted row cannot carry a record_hash — prevents pre-minting
--     "evidence" for submissions that never passed.
--   * (user_id, record_hash) is UNIQUE, and a partial unique index forbids
--     two accepted rows from claiming the same previous_record_hash — forks
--     cannot be written, closing the read-then-insert race in run-submission
--     at the database level. No-op on re-run; skipped with a notice if
--     legacy data already contains forks/duplicates.
--
-- Idempotent: IF NOT EXISTS / DO blocks make the whole script safe to re-run.
alter table public.problem_submissions drop constraint if exists submissions_accepted_must_be_chained;
alter table public.problem_submissions
  add constraint submissions_accepted_must_be_chained check (
    status <> 'accepted'
    or (record_hash is not null
        and code_hash is not null
        and tests_summary is not null
        and previous_record_hash is not null)
  ) not valid;

alter table public.problem_submissions drop constraint if exists submissions_unaccepted_unhashed;
alter table public.problem_submissions
  add constraint submissions_unaccepted_unhashed check (
    status = 'accepted' or record_hash is null
  ) not valid;

-- Unique per (user, hash). Plain UNIQUE would collide across users only in
-- the astronomically unlikely hash-collision case, but scoping to user_id
-- documents intent: one chain lineage per user, no forks within it.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'submissions_user_record_hash_unique'
      and conrelid = 'public.problem_submissions'::regclass
  ) then
    if exists (
      select 1 from public.problem_submissions
      where record_hash is not null
      group by user_id, record_hash having count(*) > 1
    ) then
      raise notice 'submissions_user_record_hash_unique not added: existing forked chain data present — dedupe first';
    else
      alter table public.problem_submissions
        add constraint submissions_user_record_hash_unique
        unique (user_id, record_hash);
    end if;
  end if;
end $$;

comment on constraint submissions_accepted_must_be_chained on public.problem_submissions is
  'DB-enforced invariant: an accepted submission always carries a complete v2 chain (record_hash, code_hash, tests_summary, previous_record_hash). Pairs with run-submission''s two-phase write: accepted rows enter as status=''submitted'' and atomically flip to ''accepted'' together with their chain stamp, so an accepted row without evidence cannot exist at any instant. NOT VALID: existing rows are not retro-validated.';
comment on constraint submissions_user_record_hash_unique on public.problem_submissions is
  'DB-enforced integrity: within one user''s history, a given record_hash exists once. Skipped (with a notice) if legacy forked data is present.';

-- Fork prevention at the exact moment a row becomes evidence: no two ACCEPTED
-- rows of one user may ever claim the same previous_record_hash (including two
-- roots claiming ""). This is what actually closes the concurrent-submission
-- fork race: both twins flip status to ''accepted'' with the same predecessor,
-- and only the first flip can win — the loser's update errors, and
-- run-submission deletes its pending row. Checked at creation; skipped with a
-- notice if legacy forked data is present.
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'uq_submissions_user_prev_hash'
  ) then
    if exists (
      select 1 from public.problem_submissions
      where status = 'accepted' and previous_record_hash is not null
      group by user_id, previous_record_hash having count(*) > 1
    ) then
      raise notice 'uq_submissions_user_prev_hash not created: existing forked chain data present — dedupe first';
    else
      create unique index uq_submissions_user_prev_hash
        on public.problem_submissions (user_id, previous_record_hash)
        where status = 'accepted' and previous_record_hash is not null;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- 6b. Verification queries for the evidence chain (optional, run manually to sanity-check)
-- ---------------------------------------------------------------------------------------
-- Every accepted row must have a complete chain and a valid version (as a client, expect 0 rows):
--   select id from public.problem_submissions
--    where status = 'accepted'
--      and (record_hash is null or code_hash is null or tests_summary is null
--           or previous_record_hash is null or record_version < 2);
-- Detect a fork directly (as a client, expect 0 rows; the UNIQUE constraint
-- should make this impossible going forward):
--   select user_id, previous_record_hash, count(*)
--     from public.problem_submissions
--    where status = 'accepted' and previous_record_hash is not null
--    group by user_id, previous_record_hash having count(*) > 1;
-- Walk every user's chain oldest -> newest; a row whose previous_record_hash
-- does not match the previous row's record_hash is a broken link (as a client, expect 0 rows):
--   with walk as (
--     select s.*, lag(s.record_hash) over (partition by s.user_id order by s.submitted_at) as expected_prev
--       from public.problem_submissions s
--      where s.status = 'accepted' and s.record_version >= 2
--   )
--   select id from walk
--    where coalesce(previous_record_hash, '') <> coalesce(expected_prev, '');

-- ----------------------------------------------------------------------------
-- 6. Verification queries (optional, run manually to sanity-check)
-- ----------------------------------------------------------------------------
-- As anon (logged out): should return 0 rows from base tables...
--   select * from public.problem_submissions;   -- 0 rows (RLS blocks)
--   select * from public.user_progress;         -- 0 rows (RLS blocks)
-- ...but the public profile view still works:
--   select display_name, skill_score from public.profile_summaries limit 5;

-- As an authenticated user (session from the app), ALL access should fail:
--   select * from public.problem_submissions;  -- permission denied (no grants)
--   insert into public.problem_submissions ... -- permission denied (no grants)
--   update public.problem_submissions set status = 'accepted' where id = '...';
--                                              -- permission denied (no grants)
--   delete from public.problem_submissions;    -- permission denied (no grants)
-- A user can therefore NEVER insert, update, or delete their own verified
-- submission records directly — not even their own rows. The ONLY writer is
-- the run-submission Edge Function with the service-role key. Hidden tests
-- (problem_tests) and the authoritative problems table are equally
-- unreadable: no grants, no policies, service-role only.
--
-- A service-role connection (Edge Functions only) reads/writes freely.
-- UPDATE / DELETE attempts from clients fail with "new row violates row-level
-- security" / "permission denied" because no policy covers those verbs.
