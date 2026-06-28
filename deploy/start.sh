#!/usr/bin/env bash
# ===== Yarn Procurement Portal - START (prod / Docker) =====
# Brings up the app container. Run from anywhere; resolves the repo root itself.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Starting Yarn Procurement Portal (container: ypp) ..."
docker compose up -d
echo
docker compose ps
echo
echo "Health:"
docker exec ypp wget -qO- http://127.0.0.1:4043/api/health || echo "  (not ready yet — check: docker compose logs -f)"
