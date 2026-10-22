#!/usr/bin/env bash
# Deployment script for OpenObserve with oauth2-proxy authentication
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENOBSERVE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

vars_file="${1:-$OPENOBSERVE_DIR/vars.yml}"

if [[ ! -f "$vars_file" ]]; then
  echo "Expected vars file at $vars_file" >&2
  echo "Copy $OPENOBSERVE_DIR/vars.example.yml to vars.yml and fill in values first." >&2
  exit 1
fi

# Extract values from vars file
app_name=$(grep '^app_name:' "$vars_file" | cut -d: -f2 | tr -d ' ')
proxy_name=$(grep '^proxy_name:' "$vars_file" | cut -d: -f2 | tr -d ' ')
protected_host=$(grep '^protected_host:' "$vars_file" | cut -d: -f2 | tr -d ' ')
internal_host=$(grep '^internal_host:' "$vars_file" | cut -d: -f2 | tr -d ' ')
uaa_service_name=$(grep '^uaa_service_name:' "$vars_file" | cut -d: -f2 | tr -d ' ')
cookie_domain=$(grep '^cookie_domain:' "$vars_file" | cut -d: -f2 | tr -d ' ')

# Validate cookie_domain matches protected_host
if [[ "$cookie_domain" != "$protected_host" ]]; then
  echo "ERROR: cookie_domain ($cookie_domain) must match protected_host ($protected_host)" >&2
  echo "Update vars.yml and try again." >&2
  exit 1
fi

echo "=============================================="
echo "Deploying OpenObserve with oauth2-proxy"
echo "=============================================="
echo "OpenObserve app:   $app_name"
echo "Proxy app:         $proxy_name"
echo "Public route:      https://$protected_host"
echo "Internal route:    $internal_host"
echo "UAA service:       $uaa_service_name"
echo "=============================================="
echo ""

# Step 1: Create UAA service if it doesn't exist
echo "Step 1: Creating/updating Cloud.gov identity-provider service..."
redirect_uri="https://${protected_host}/oauth2/callback"

if cf service "$uaa_service_name" >/dev/null 2>&1; then
  echo "  Service '$uaa_service_name' exists, updating redirect URI..."
  cf update-service "$uaa_service_name" -c "{\"redirect_uri\":[\"${redirect_uri}\"]}" || true
else
  echo "  Creating service '$uaa_service_name'..."
  cf create-service cloud-gov-identity-provider oauth-client "$uaa_service_name" \
    -c "{\"redirect_uri\":[\"${redirect_uri}\"]}"
fi
echo ""

# Step 2: Deploy OpenObserve (internal app)
echo "Step 2: Deploying OpenObserve (internal)..."
cf push -f "$OPENOBSERVE_DIR/manifest.yml" --vars-file "$vars_file"
echo ""

# Step 3: Map internal route
echo "Step 3: Mapping internal route..."
cf map-route "$app_name" apps.internal --hostname "${app_name}" || true
echo ""

# Step 4: Deploy oauth2-proxy
echo "Step 4: Deploying oauth2-proxy..."
cf push -f "$OPENOBSERVE_DIR/oauth2-proxy-manifest.yml" --vars-file "$vars_file"
echo ""

# Step 5: Create network policy for container-to-container communication
echo "Step 5: Creating network policy (proxy -> openobserve on port 8080)..."
cf add-network-policy "$proxy_name" "$app_name" --port 8080 --protocol tcp
echo ""

echo "=============================================="
echo "Deployment complete!"
echo ""
echo "UI Access (OAuth2 protected, @gsa.gov only):"
echo "  https://$protected_host"
echo ""
echo "API Access (Basic Auth):"
echo "  curl -u \"\$OPENOBSERVE_USER:\$OPENOBSERVE_PASSWORD\" https://$protected_host/api/default/default/_json"
echo ""
echo "Allowed API paths (bypass OAuth, require Basic Auth):"
echo "  /api/*   - General API, log ingestion"
echo "  /aws/*   - AWS Kinesis Firehose, CloudWatch"
echo "  /gcp/*   - GCP Pub/Sub, Cloud Logging"
echo "  /azure/* - Azure Event Hubs, Monitor"
echo ""
echo "Credentials: Use zo_root_email and zo_root_password from vars.yml"
echo "=============================================="
