#!/bin/bash

# Ensure the data directory exists
mkdir -p /data

# Ensure the SQLite database file exists
if [ ! -f /data/hedgedoc.sqlite ]; then
  echo "Creating SQLite database file..."
  sqlite3 /data/hedgedoc.sqlite "VACUUM;"
fi

# Set a default session secret if not provided
if [ -z "$CMD_SESSION_SECRET" ]; then
  CMD_SESSION_SECRET=$(openssl rand -base64 32)
  export CMD_SESSION_SECRET
  echo "Session secret not set. Generated a random one."
fi

# Start the application
exec "$@"
