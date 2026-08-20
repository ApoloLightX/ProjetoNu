# Database recovery and persistence posture

This runbook records what ATLAS can recover today, what has been verified in the live Supabase project, and which claims the project intentionally does **not** make yet.

## Recovery boundary

ATLAS currently treats Git history plus versioned SQL migrations as the source of truth for reconstructing the **schema, security posture and server-side persistence functions**.

That is not the same as a data backup.

If runtime assessment/review records become valuable, provider backup retention and restore capability must be confirmed before the project can claim an RPO/RTO for persisted data.

## Verified live posture

Verified against the connected Supabase project on 2026-08-20:

- `counterparties`, `evidence_items`, `assessment_runs`, `human_reviews` and `ai_runs` all have row-level security enabled;
- there are no `anon` or `authenticated` table policies for those persistence tables;
- privileged persistence RPCs expose `EXECUTE` to `service_role`, not anonymous/browser roles;
- the current tables contained no live rows at inspection time;
- the current access-path indexes are:
  - unique `counterparties.external_ref`;
  - `assessment_runs(counterparty_id, created_at desc)`;
  - `evidence_items(counterparty_id)`;
  - `ai_runs(assessment_run_id)`;
  - `human_reviews(assessment_run_id)`.

The empty-table observation is a point-in-time fact, not a permanent property of the project.

## Why no extra indexes were added in V7

The current application access paths are replay by assessment run ID, assessment history by counterparty, evidence by counterparty, AI runs by assessment, and human reviews by assessment.

The existing indexes cover those known paths. With no production dataset or measured slow query, adding speculative compound indexes would increase write/storage cost without evidence of benefit.

New indexes should be justified by an actual query plan (`EXPLAIN` / `EXPLAIN ANALYZE`) or a measured access pattern.

## Connection behavior

The risk engine talks to Supabase through its HTTPS/PostgREST interface rather than opening raw PostgreSQL connections from each Vercel invocation.

Therefore ATLAS does not add a custom application-side PostgreSQL connection pool in this architecture. Connection management remains behind the managed Supabase/PostgREST boundary.

If the backend later switches to direct PostgreSQL connections, serverless connection pooling becomes a separate design decision that must be measured and documented.

## Schema recovery procedure

1. Provision or select the target Supabase project.
2. Apply repository migrations in order:
   - `0001_init.sql`
   - `0002_persistence_security.sql`
   - `0003_ai_run_trace.sql`
   - `0004_human_reviews_index.sql`
3. Reconfigure server-only environment variables outside Git.
4. Verify row-level security is enabled on all persistence tables.
5. Verify anonymous/authenticated roles do not have unintended table or RPC privileges.
6. Verify expected indexes exist.
7. Run risk-engine persistence tests and smoke-test `/health`.
8. Restore runtime data from a verified provider backup if such a backup is available and required.
9. Replay representative assessment snapshots and confirm human/AI trace links remain intact.

## Validation queries

These checks are safe examples for an operator. They should be executed against the intended recovery environment, not copied blindly into an unrelated database.

```sql
select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'counterparties',
    'evidence_items',
    'assessment_runs',
    'human_reviews',
    'ai_runs'
  );
```

```sql
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
```

```sql
select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where specific_schema = 'public'
  and routine_name in (
    'persist_assessment_snapshot',
    'record_human_review',
    'record_ai_run_trace'
  );
```

## Backup and RPO/RTO status

**Not yet claimed.**

V7 does not invent a backup guarantee that has not been verified from the active Supabase plan. Before ATLAS stores non-disposable real reviewer data, the project must confirm:

- whether automatic backups are enabled;
- retention period;
- whether point-in-time recovery is available;
- restore procedure;
- expected recovery point objective (RPO);
- expected recovery time objective (RTO);
- who owns and tests recovery.

Until then, the honest statement is:

> schema/security recovery is reproducible from Git + migrations; recovery of runtime records depends on a separately verified backup capability.

## Failure drill for the portfolio stage

A lightweight recovery drill is sufficient today:

1. create a disposable database environment;
2. apply all migrations from zero;
3. run the persistence test suite;
4. verify RLS/grants/indexes;
5. persist one synthetic assessment;
6. replay it;
7. add one synthetic human review and one AI trace;
8. verify the links survive a fresh application deployment.

This tests the recovery path ATLAS actually owns without pretending to operate a multi-region disaster-recovery system.
