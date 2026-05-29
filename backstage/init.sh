#!/bin/bash
set -e

echo "Starting Backstage Initialization on cloud.gov..."

# 1. Dynamically discover database credentials
if [ -n "$VCAP_SERVICES" ]; then
  echo "Parsing database credentials from VCAP_SERVICES..."
  export POSTGRES_HOST=$(node -e 'const services = JSON.parse(process.env.VCAP_SERVICES || "{}"); const creds = ((services["aws-rds"] || [])[0] || {}).credentials || {}; process.stdout.write(creds.host || "");')
  export POSTGRES_PORT=$(node -e 'const services = JSON.parse(process.env.VCAP_SERVICES || "{}"); const creds = ((services["aws-rds"] || [])[0] || {}).credentials || {}; process.stdout.write(creds.port || "5432");')
  export POSTGRES_USER=$(node -e 'const services = JSON.parse(process.env.VCAP_SERVICES || "{}"); const creds = ((services["aws-rds"] || [])[0] || {}).credentials || {}; process.stdout.write(creds.username || "");')
  export POSTGRES_PASSWORD=$(node -e 'const services = JSON.parse(process.env.VCAP_SERVICES || "{}"); const creds = ((services["aws-rds"] || [])[0] || {}).credentials || {}; process.stdout.write(creds.password || "");')
  export POSTGRES_DB=$(node -e 'const services = JSON.parse(process.env.VCAP_SERVICES || "{}"); const creds = ((services["aws-rds"] || [])[0] || {}).credentials || {}; process.stdout.write(creds.db_name || "");')
fi

# Fallback: Parse DATABASE_URL if available and VCAP_SERVICES didn't yield values
if [ -z "$POSTGRES_HOST" ] && [ -n "$DATABASE_URL" ]; then
  echo "Parsing database credentials from DATABASE_URL..."
  export POSTGRES_HOST=$(node -e 'const u = new URL(process.env.DATABASE_URL); process.stdout.write(u.hostname);')
  export POSTGRES_PORT=$(node -e 'const u = new URL(process.env.DATABASE_URL); process.stdout.write(u.port || "5432");')
  export POSTGRES_USER=$(node -e 'const u = new URL(process.env.DATABASE_URL); process.stdout.write(u.username);')
  export POSTGRES_PASSWORD=$(node -e 'const u = new URL(process.env.DATABASE_URL); process.stdout.write(decodeURIComponent(u.password));')
  export POSTGRES_DB=$(node -e 'const u = new URL(process.env.DATABASE_URL); process.stdout.write(u.pathname.substring(1));')
fi

if [ -z "$POSTGRES_HOST" ]; then
  echo "WARNING: No database credentials found. If using SQLite, ensure DATABASE_URL is empty. Otherwise, please bind an aws-rds service."
fi

# 2. Dynamically determine the Backstage Host Name from cloud.gov environment
if [ -z "$BACKSTAGE_HOST" ] && [ -n "$VCAP_APPLICATION" ]; then
  export BACKSTAGE_HOST=$(node -e 'const app = JSON.parse(process.env.VCAP_APPLICATION || "{}"); process.stdout.write((app.application_uris || [])[0] || "");')
  echo "Automatically detected BACKSTAGE_HOST: ${BACKSTAGE_HOST}"
fi

if [ -z "$BACKSTAGE_HOST" ]; then
  export BACKSTAGE_HOST="localhost:3000"
  echo "WARNING: BACKSTAGE_HOST was not set and could not be detected. Defaulting to localhost:3000."
fi

# 3. Ensure port is set (Cloud.gov injects $PORT)
export PORT="${PORT:-3000}"
echo "Backstage starting on port: ${PORT}"

# Execute Backstage Backend with compiled production configuration
exec node packages/backend --config app-config.yaml --config app-config.production.yaml
