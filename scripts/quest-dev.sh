#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/../college-bound-backend"
FRONTEND_PORT="${PORT:-4000}"

if [[ ! -d "${BACKEND_DIR}" ]]; then
  echo "Backend repo not found at: ${BACKEND_DIR}"
  echo "Update scripts/quest-dev.sh if your backend path is different."
  exit 1
fi

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    echo "Stopping backend (pid ${BACKEND_PID})..."
    kill "${BACKEND_PID}" || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting backend..."
(
  cd "${BACKEND_DIR}"
  ./mvnw spring-boot:run
) &
BACKEND_PID=$!

echo "Waiting for backend on http://localhost:8080 ..."
for _ in {1..90}; do
  if curl -s -o /dev/null "http://localhost:8080"; then
    break
  fi
  sleep 1

done

echo "Backend started."
echo "Starting frontend on http://localhost:${FRONTEND_PORT}/college-bound/college-quest/ ..."

cd "${ROOT_DIR}"
PORT="${FRONTEND_PORT}" make serve-no-livereload
