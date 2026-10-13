#!/usr/bin/env bash
# Roda os testes SQL (RLS, Storage e reordenação) contra o Supabase LOCAL (`supabase start`).
# Antes, cria o administrador de teste com as variáveis E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD.
# Recusa qualquer banco que não seja local.
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
case "$DB_URL" in
  *@127.0.0.1:* | *@localhost:*) ;;
  *)
    echo "Recusado: este script só roda contra o banco local." >&2
    exit 1
    ;;
esac
: "${E2E_ADMIN_EMAIL:?Defina E2E_ADMIN_EMAIL}"
: "${E2E_ADMIN_PASSWORD:?Defina E2E_ADMIN_PASSWORD}"

cd "$(dirname "$0")/.."

# Sem psql instalado, usa o que vem dentro do contêiner do banco local.
run_sql() {
  local file="$1"
  shift
  if command -v psql >/dev/null 2>&1; then
    psql "$DB_URL" -v ON_ERROR_STOP=1 "$@" -f "$file"
  else
    docker exec -i supabase_db_salgae-lanchonete \
      psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@" -f - <"$file"
  fi
}

echo "== administrador de teste"
run_sql supabase/tests/fixtures/admin_local.sql -q \
  -v admin_email="$E2E_ADMIN_EMAIL" -v admin_password="$E2E_ADMIN_PASSWORD"

for test_file in supabase/tests/*.sql; do
  echo "== $test_file"
  run_sql "$test_file"
done

echo "Todos os testes de banco passaram."
