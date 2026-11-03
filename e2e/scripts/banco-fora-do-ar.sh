#!/usr/bin/env bash
set -euo pipefail

: "${E2E_BASE_URL:?Defina E2E_BASE_URL.}"
: "${NEXT_PUBLIC_SUPABASE_URL:?Defina NEXT_PUBLIC_SUPABASE_URL.}"

product_name='Coxinha de frango'
pages=("/" "/cardapio" "/produto/coxinha-de-frango")

assert_cached_pages() {
  for page in "${pages[@]}"; do
    body="$(curl --fail --silent --show-error "${E2E_BASE_URL}${page}")"
    grep --fixed-strings --quiet "$product_name" <<< "$body"
  done
}

assert_cached_pages

supabase stop --no-backup
if curl --silent --max-time 5 "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/" >/dev/null; then
  echo 'O Supabase ainda responde depois de parar.' >&2
  exit 1
fi

# Passa dos 60 s de revalidação: a falha ao revalidar não pode tirar o último valor do ar.
sleep 65
assert_cached_pages
sleep 5
assert_cached_pages
