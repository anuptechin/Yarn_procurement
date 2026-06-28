#!/usr/bin/env bash
# ===== Yarn Procurement Portal - STOP (prod / Docker) =====
# Stops + removes the app container. The shared DB (postgres_common) and the
# nginx_proxy are untouched. Start again with ./deploy/start.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Stopping Yarn Procurement Portal (container: ypp) ..."
docker compose down
echo "Stopped."
