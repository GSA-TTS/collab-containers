#!/usr/bin/env bash
set -euo pipefail

candidate="${1:?candidate required}"
root_dir="$(cd "$(dirname "$0")/.." && pwd)"

case "$candidate" in
  fixture)
    vars_file="${2:-$root_dir/fixture-app/vars.yml}"
    if [[ ! -f "$vars_file" ]]; then
      echo "Expected vars file at $vars_file" >&2
      echo "Copy $root_dir/fixture-app/vars.example.yml to vars.yml and fill in route values first." >&2
      exit 1
    fi
    cf push -f "$root_dir/fixture-app/manifest.yml" --vars-file "$vars_file" -p "$root_dir/fixture-app"
    ;;
  oauth2-proxy|pomerium|keycloak)
    vars_file="${2:-$root_dir/$candidate/vars.yml}"
    if [[ ! -f "$vars_file" ]]; then
      echo "Expected vars file at $vars_file" >&2
      echo "Copy $root_dir/$candidate/vars.example.yml to vars.yml and fill in secrets first." >&2
      exit 1
    fi
    cf push -f "$root_dir/$candidate/manifest.yml" --vars-file "$vars_file"
    ;;
  authentik|authelia)
    echo "$candidate is documented in $root_dir/$candidate/README.md but is not auto-pushed by this helper." >&2
    exit 1
    ;;
  *)
    echo "Unknown candidate: $candidate" >&2
    exit 1
    ;;
esac