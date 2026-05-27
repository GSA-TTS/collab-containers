#!/usr/bin/env bash
set -euo pipefail

candidate="${1:?candidate required}"
base_url="${2:?base url required}"

echo "=== ${candidate}: unauthenticated root ==="
curl -skI "$base_url/" | sed -n '1,10p'

echo
echo "=== ${candidate}: redirect fidelity ==="
curl -skI "$base_url/redirect?to=/api/ping%3Fprobe%3D1" | sed -n '1,12p'

echo
echo "=== ${candidate}: fixture download ==="
curl -skI "$base_url/download" | sed -n '1,12p'

echo
echo "=== ${candidate}: fixture SSE probe ==="
curl -skN --max-time 5 "$base_url/events" | sed -n '1,6p'