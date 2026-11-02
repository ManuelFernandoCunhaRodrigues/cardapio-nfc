#!/usr/bin/env bash
set -euo pipefail

: "${API_PID_FILE:?Defina API_PID_FILE.}"
: "${E2E_BASE_URL:?Defina E2E_BASE_URL.}"

product_name='Coxinha de frango'
pages=("/" "/cardapio" "/produto/coxinha-de-frango")

assert_cached_pages() {
  for page in "${pages[@]}"; do
    body="$(curl --fail --silent --show-error "${E2E_BASE_URL}${page}")"
    grep --fixed-strings --quiet "$product_name" <<< "$body"
  done
}

assert_cached_pages

api_pid="$(cat "$API_PID_FILE")"
kill "$api_pid"
for _ in $(seq 1 20); do
  kill -0 "$api_pid" 2>/dev/null || break
  sleep 1
done
if kill -0 "$api_pid" 2>/dev/null; then
  echo 'A API não encerrou.' >&2
  exit 1
fi
if curl --fail --silent "${E2E_API_URL}/health" >/dev/null; then
  echo 'A API ainda responde depois de encerrar o PID.' >&2
  exit 1
fi

sleep 65
assert_cached_pages
sleep 5
assert_cached_pages
