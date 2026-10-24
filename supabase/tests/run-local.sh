#!/usr/bin/env bash
# Applies every migration in supabase/migrations to a throwaway local Postgres
# (with PostGIS and the test-only Supabase shim), then runs the SQL tests in
# supabase/tests/*.test.sql. Never touches a Supabase project.
#
# Requires: Postgres 16 binaries (initdb/pg_ctl/psql) and PostGIS 3 on this
# machine. Usage: supabase/tests/run-local.sh [test-file ...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-55432}"
export PGHOST="$WORK" PGPORT="$PORT" PGUSER=postgres PGDATABASE=postgres

cleanup() { "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

run_pg() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
chmod 777 "$WORK"
run_pg "'$PGBIN/initdb' -D '$WORK/data' -U postgres -A trust >/dev/null"
run_pg "'$PGBIN/pg_ctl' -D '$WORK/data' -o '-k $WORK -p $PORT -c listen_addresses=' -l '$WORK/log' -w start >/dev/null"

psql_q() { psql -v ON_ERROR_STOP=1 -q -X "$@"; }
psql_q -f "$ROOT/supabase/tests/supabase_shim.sql" >/dev/null
# 0001_schema / 0002_rls / 0003_functions are the superseded first schema path;
# 0006_game_schema.sql re-creates the game schema "on top of a project that only
# has 0001_profiles.sql", which is how production was built. Replaying both
# paths conflicts (0006 cannot redefine 0001's view), so the old path is skipped.
# 0005_note_reports.sql needs that old path; 0006 includes note_reports too.
# 0003_functions.sql still owns helpers nothing later redefines (level_for_xp,
# start_quest, ...), so it is applied right after 0006 instead of before it.
SKIP_RE='/(0001_schema|0002_rls|0003_functions|0005_note_reports)\.sql$'
apply() {
  applied=$((applied + 1))
  if ! out=$(psql_q -f "$1" 2>&1); then echo "MIGRATION FAILED: $(basename "$1")"; echo "$out"; exit 1; fi
}
applied=0
for f in "$ROOT"/supabase/migrations/*.sql; do
  [[ "$f" =~ $SKIP_RE ]] && continue
  apply "$f"
  [[ "$f" == */0006_game_schema.sql ]] && apply "$ROOT/supabase/migrations/0003_functions.sql"
done
echo "migrations: applied $applied files"

tests=("$@")
[ ${#tests[@]} -eq 0 ] && tests=("$ROOT"/supabase/tests/*.test.sql)
status=0
for t in "${tests[@]}"; do
  [ -e "$t" ] || continue
  if out=$(psql_q -f "$t" 2>&1); then echo "PASS $(basename "$t")"; echo "$out" | grep -oE 'ok - .*' | sed 's/^/  /' || true
  else echo "FAIL $(basename "$t")"; echo "$out"; status=1; fi
done
exit $status
