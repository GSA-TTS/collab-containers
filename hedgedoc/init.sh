#!/bin/sh
# Entrypoint wrapper. POSIX sh only: the Alpine base image has no bash, openssl or sqlite3.
set -eu

# Ensure the data directory exists (HedgeDoc creates the SQLite file itself on first start).
mkdir -p /data

# Set a random session secret if one was not provided. Without a stable secret,
# sessions are invalidated on every restart, so set CMD_SESSION_SECRET in production.
if [ -z "${CMD_SESSION_SECRET:-}" ]; then
  CMD_SESSION_SECRET=$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("base64"))')
  export CMD_SESSION_SECRET
  echo "Session secret not set. Generated a random one."
fi

exec "$@"
