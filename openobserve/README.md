# OpenObserve on Cloud.gov with oauth2-proxy Authentication

OpenObserve is a cloud-native observability platform for logs, metrics, and traces. This deployment uses oauth2-proxy as an authentication gateway to enforce Cloud.gov UAA sessions for UI access while allowing API endpoints to use Basic Auth for machine-to-machine ingestion.

## Architecture

```
                                    ┌─────────────────────────────────────┐
                                    │         oauth2-proxy                │
┌─────────────────┐                 │  ┌─────────────────────────────┐   │
│  User Browser   │─── /web/* ─────▶│  │  OAuth2 Authentication     │   │
│  (@gsa.gov)     │                 │  │  (Cloud.gov UAA / GSA SSO) │   │
└─────────────────┘                 │  └─────────────────────────────┘   │
                                    │               │                    │
                                    │               ▼                    │
┌─────────────────┐                 │  ┌─────────────────────────────┐   │     ┌─────────────────┐
│  Log Streams    │─ /api/* ───────▶│  │  Skip Auth (passthrough)   │───┼────▶│   OpenObserve   │
│  AWS/GCP/Azure  │─ /aws/* ───────▶│  │  Basic Auth at OpenObserve │   │     │ (internal only) │
│  Kinesis, etc.  │─ /gcp/* ───────▶│  └─────────────────────────────┘   │     │  :8080          │
└─────────────────┘─ /azure/* ─────▶│                                    │     └─────────────────┘
                                    └─────────────────────────────────────┘
```

**Key Points:**
- **UI Access**: Protected by Cloud.gov UAA with GSA email domain restriction (`@gsa.gov` only)
- **API Access**: Bypasses OAuth, uses OpenObserve's built-in Basic Auth for machine-to-machine
- OpenObserve runs on an internal `.apps.internal` route (not directly accessible)
- Container-to-container networking secures the proxy-to-app communication

## Prerequisites

1. Cloud Foundry CLI installed and logged into Cloud.gov
2. Access to create `cloud-gov-identity-provider` service instances
3. Target space with sufficient memory quota (2.5GB+ for both apps)

## Quick Start

### 1. Configure Variables

```bash
cd openobserve
cp vars.example.yml vars.yml
```

Edit `vars.yml` and update:
- `cookie_secret`: Generate with `openssl rand -base64 32`
- `zo_root_email`: Admin email for OpenObserve
- `zo_root_password`: Admin password for OpenObserve (use for API Basic Auth)

### 2. Deploy

```bash
./bin/push-openobserve.sh
```

This script will:
1. Create/update the UAA identity provider service
2. Deploy OpenObserve (internal route only)
3. Deploy oauth2-proxy (public route)
4. Create network policy for container-to-container communication

### 3. Access

**Web UI**: Navigate to `https://openobserve-staging.app.cloud.gov`

You'll be redirected to Cloud.gov UAA for authentication. Only `@gsa.gov` email addresses are allowed.

**API Access**: Use Basic Auth with your OpenObserve credentials:

```bash
curl -u "root@example.com:Complexpass#123" \
  https://openobserve-staging.app.cloud.gov/api/default/default/_json \
  -H "Content-Type: application/json" \
  -d '[{"message": "test log", "level": "info"}]'
```

## Manual Deployment

If you prefer to deploy manually:

```bash
# 1. Create UAA service
cf create-service cloud-gov-identity-provider oauth-client openobserve-uaa \
  -c '{"redirect_uri":["https://openobserve-staging.app.cloud.gov/oauth2/callback"]}'

# 2. Deploy OpenObserve (internal)
cf push -f manifest.yml --vars-file vars.yml

# 3. Deploy oauth2-proxy
cf push -f oauth2-proxy-manifest.yml --vars-file vars.yml

# 4. Create network policy
cf add-network-policy openobserve-proxy-staging openobserve-staging --port 8080 --protocol tcp
```

## Ingesting Logs

### From Cloud.gov Apps (Log Drains)

Cloud.gov log drains send syslog format. You'll need a transformer (Vector/Fluent Bit) to convert to JSON. **Do not bind a log drain to OpenObserve itself** - this creates an infinite loop.

### From AWS (Kinesis Firehose)

Use the Kinesis Firehose endpoint with Basic Auth:

```
Endpoint: https://openobserve-staging.app.cloud.gov/aws/default/default/_kinesis_firehose
Authentication: Basic Auth (ZO_ROOT_USER_EMAIL:ZO_ROOT_USER_PASSWORD)
```

### From Direct API

```bash
# JSON logs
curl -u "root@example.com:Complexpass#123" \
  https://openobserve-staging.app.cloud.gov/api/default/default/_json \
  -H "Content-Type: application/json" \
  -d '[{"message": "hello", "level": "info", "app": "myapp"}]'

# Bulk ingestion
curl -u "root@example.com:Complexpass#123" \
  https://openobserve-staging.app.cloud.gov/api/default/default/_bulk \
  -H "Content-Type: application/json" \
  -d '{"index": {}}
{"message": "log line 1"}
{"index": {}}
{"message": "log line 2"}'
```

## Configuration Reference

### vars.yml

| Variable | Description |
|----------|-------------|
| `app_name` | Name for the OpenObserve app |
| `proxy_name` | Name for the oauth2-proxy app |
| `protected_host` | Public hostname (e.g., `openobserve-staging.app.cloud.gov`) |
| `internal_host` | Internal hostname (e.g., `openobserve-staging.apps.internal`) |
| `uaa_service_name` | Cloud.gov identity provider service name |
| `cookie_secret` | 32-byte base64-encoded secret for session cookies |
| `cookie_domain` | Domain for session cookies (must match `protected_host`) |
| `whitelist_domain` | Allowed redirect domains |
| `uaa_scope` | OAuth scopes (typically `openid`) |
| `zo_root_email` | OpenObserve admin email (also used for API Basic Auth) |
| `zo_root_password` | OpenObserve admin password (also used for API Basic Auth) |

### Memory and Resources

| App | Memory | Disk |
|-----|--------|------|
| OpenObserve | 2G | 2G |
| oauth2-proxy | 256M | 512M |

## Authentication

### UI Authentication (OAuth2)

- Protected by Cloud.gov UAA with OIDC
- Restricted to `@gsa.gov` email addresses
- Uses GSA SecureAuth SAML SSO (PIV card or credentials)

### API Authentication (Basic Auth)

The following paths bypass OAuth and use OpenObserve's built-in Basic Auth:

| Path Pattern | Use Case |
|--------------|----------|
| `/api/*` | General API access, log ingestion |
| `/aws/*` | AWS Kinesis Firehose, CloudWatch |
| `/gcp/*` | GCP Pub/Sub, Cloud Logging |
| `/azure/*` | Azure Event Hubs, Monitor |

**Credentials**: Use `ZO_ROOT_USER_EMAIL` and `ZO_ROOT_USER_PASSWORD` from vars.yml

## Authentication Flow

### UI Flow
1. User accesses `https://openobserve-staging.app.cloud.gov`
2. oauth2-proxy redirects to Cloud.gov UAA (`login.fr.cloud.gov`)
3. UAA redirects to GSA SecureAuth for SAML SSO (PIV card or credentials)
4. After authentication, UAA redirects back to oauth2-proxy callback
5. oauth2-proxy validates email domain is `@gsa.gov`
6. oauth2-proxy sets a session cookie and proxies requests to OpenObserve

### API Flow
1. Client sends request to `/api/*`, `/aws/*`, `/gcp/*`, or `/azure/*`
2. oauth2-proxy passes request through without OAuth (skip-auth-routes)
3. OpenObserve validates Basic Auth credentials
4. Request is processed

## Technical Notes

### Cloud.gov UAA Split-Domain Architecture

Cloud.gov UAA uses a split-domain architecture:
- `login.fr.cloud.gov` - Browser-facing authentication
- `uaa.fr.cloud.gov` - Backchannel token exchanges

oauth2-proxy is configured to use `login.fr.cloud.gov` for OIDC discovery with `--insecure-oidc-skip-issuer-verification` to handle this split.

### GSA Federated Accounts

GSA accounts authenticated via SAML don't have `email_verified` claims. oauth2-proxy is configured with `--insecure-oidc-allow-unverified-email` to accept these accounts.

### Container-to-Container Networking

The proxy communicates with OpenObserve via Cloud Foundry's internal overlay network on port 8080. This avoids the HTTP 463 loop that occurs when proxying through the public Gorouter.

### Binary Buildpack

OpenObserve is deployed using the `binary_buildpack` with the Linux musl binary (no glibc dependency). The binary is downloaded at container startup from OpenObserve's releases.

## Troubleshooting

### "No saved authentication request was found"
This SAML error occurs if browser traffic goes to `uaa.fr.cloud.gov` instead of `login.fr.cloud.gov`. Verify the OIDC issuer URL is set to `https://login.fr.cloud.gov/oauth/token`.

### HTTP 502 or 463 errors
Verify the network policy exists:
```bash
cf network-policies
```

Ensure the upstream URL uses the internal route:
```
http://openobserve-staging.apps.internal:8080
```

### "email isn't verified" errors
Ensure `OAUTH2_PROXY_INSECURE_OIDC_ALLOW_UNVERIFIED_EMAIL` is set to `true`.

### CSRF cookie errors / 403 on callback
Ensure `cookie_domain` in vars.yml matches the actual hostname (e.g., `openobserve-staging.app.cloud.gov`, not `openobserve.app.cloud.gov`).

### API returns 302 redirect instead of data
The API path may not be in the skip-auth list. Check that the path starts with `/api/`, `/aws/`, `/gcp/`, or `/azure/`.

### "usage stream not found" errors in OpenObserve logs
Normal for fresh installations. These internal streams are created when you start ingesting data.

## Security Considerations

- OpenObserve is not directly accessible; all traffic goes through oauth2-proxy
- UI access restricted to `@gsa.gov` email addresses via Cloud.gov UAA
- API access requires Basic Auth credentials
- Sessions are stored in encrypted cookies (not server-side)
- TLS is terminated at Cloud Foundry's Gorouter
- Internal traffic between proxy and app uses Cloud Foundry's overlay network
- API endpoints (`/api/`, `/aws/`, `/gcp/`, `/azure/`) bypass OAuth but require Basic Auth

## References

- [OpenObserve Documentation](https://openobserve.ai/docs/)
- [OpenObserve API Reference](https://openobserve.ai/docs/api/)
- [oauth2-proxy Documentation](https://oauth2-proxy.github.io/oauth2-proxy/)
- [Cloud.gov Identity Provider](https://cloud.gov/docs/services/cloud-gov-identity-provider/)
- [Cloud.gov Log Drains](https://cloud.gov/docs/services/log-drains/)
- [auth-benchmark README](../auth-benchmark/README.md) - Detailed ADRs for Cloud.gov auth patterns
