#!/usr/bin/env bash
set -euo pipefail
# Reuses only the explicitly named disposable test container.
container="${AUTHORHUB_TEST_CONTAINER:-authorhub-test-db}"
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres > /dev/null 2>&1; then break; fi
  sleep 1
done
database="authorhub_verify_$(date +%s)_$$"
docker exec "$container" createdb -U postgres "$database"
trap 'docker exec "$container" dropdb -U postgres "$database"' EXIT
docker exec -i "$container" psql -U postgres -d "$database" -v ON_ERROR_STOP=1 < supabase/tests/bootstrap.sql
for migration in supabase/migrations/*.sql; do
  docker exec -i "$container" psql -U postgres -d "$database" -v ON_ERROR_STOP=1 < "$migration"
done
docker exec -i "$container" psql -U postgres -d "$database" -v ON_ERROR_STOP=1 < supabase/tests/publishing.sql
