#!/usr/bin/env bash
set -euo pipefail

candidate="${1:?candidate name required}"
protected_host="${2:?protected host required}"
service_name="${3:-auth-bench-${candidate}-uaa}"
authenticate_host="${4:-}"

case "$candidate" in
  oauth2-proxy)
    callback_path="/oauth2/callback"
    callback_host="$protected_host"
    ;;
  pomerium)
    callback_path="/oauth2/callback"
    callback_host="${authenticate_host:?authenticate host required for pomerium}"
    ;;
  *)
    echo "Unsupported automated UAA client candidate: $candidate" >&2
    echo "Supported: oauth2-proxy, pomerium" >&2
    exit 1
    ;;
esac

redirect_uri="https://${callback_host}${callback_path}"

echo "Creating or updating Cloud.gov identity-provider service '$service_name' with redirect URI '$redirect_uri'"

if cf service "$service_name" >/dev/null 2>&1; then
  cf update-service cloud-gov-identity-provider "$service_name" -c "{\"redirect_uri\":\"${redirect_uri}\"}"
else
  cf create-service cloud-gov-identity-provider oauth-client "$service_name" -c "{\"redirect_uri\":\"${redirect_uri}\"}"
fi