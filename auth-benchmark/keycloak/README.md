# Keycloak in this benchmark

Keycloak is the benchmark's **recommended identity solution** and the declared **winner** for GSA federal application teams. See [`../docs/decision.md`](../docs/decision.md) for the formal decision record and [`../docs/candidates/keycloak.md`](../docs/candidates/keycloak.md) for the full write-up.

> **Keycloak is currently used for USAi, PIC, and Touchpoints, and is used in actively authorized systems.**

## Candidate matrix

| Field | Value |
| --- | --- |
| **Candidate** | Keycloak |
| **Type** | Self-hosted OIDC / OAuth 2.0 / SAML Identity & Access Management (IAM) server |
| **Upstream** | https://www.keycloak.org/ |
| **Container image** | `ghcr.io/gsa-tts/terraform-cloudgov/keycloak-server:latest` |
| **Protocols** | OIDC (Authorization Code + PKCE), OAuth 2.0, SAML 2.0, Device Flow |
| **Federation** | Native identity brokering (e.g., cloud.gov IdP, Login.gov, Google, SAML) |
| **User store** | Built-in DB (Postgres via cloud.gov RDS) + LDAP / AD federation |
| **MFA** | Built-in TOTP, WebAuthn, recovery codes |
| **Admin UX** | Full Web admin console, REST Admin API, `kcadm.sh` CLI |
| **RBAC** | Realms → clients → roles → groups; per-client role mappings |
| **Deployability on cloud.gov** | Runs as a `cf` app (Docker image), backed by cloud.gov `aws-rds` |
| **Session / token model** | Server-issued JWTs (RS256), rotating refresh tokens, offline tokens |

## Cross-references

- **Reusable container image**: [`ghcr.io/gsa-tts/terraform-cloudgov/keycloak-server:latest`](https://github.com/GSA-TTS/terraform-cloudgov/pkgs/container/terraform-cloudgov%2Fkeycloak-server)
- **Reference Terraform module used by GSA production deployments**: [`GSA-TTS/pic-blm-cxworks`](https://github.com/GSA-TTS/pic-blm-cxworks) — see `terraform/apps/auth`.
- **In-flight Precogly example manifest**: `precogly/manifest-keycloak.yml`.
- **Login.gov integration guide** (Scenario B, brokered identity): [`../LOGINGOV.md`](../LOGINGOV.md)

## What Keycloak measures

Keycloak is not a thin auth proxy. It is the benchmark candidate for the brokered-identity pattern:

- a stable OIDC issuer for downstream apps
- external identity providers (Cloud.gov UAA, Login.gov, GSA SAML) brokered through Keycloak
- longer-lived sessions and richer authorization controls than direct-UAA app clients
- production-proven inside GSA — see the verbatim statement above

## Cloud.gov deployment shape

The scaffold here mirrors the pattern from `pic-blm-cxworks`:

- run Keycloak behind Cloud Foundry edge TLS termination
- trust `X-Forwarded-*` headers (`KC_PROXY_HEADERS=xforwarded`)
- derive Postgres credentials from `VCAP_SERVICES` at start time
- bind an `aws-rds` Postgres service instance
- listen on the platform-provided `$PORT`

## Files

| File | Purpose |
| --- | --- |
| `manifest.yml` | Cloud Foundry manifest, parameterized with `((...))` vars |
| `vars.example.yml` | Template for `vars.yml` (which you create locally and never commit) |

## Bootstrap deployment guide

### Prerequisites

- `cf` CLI logged into the target org and space (`cf login -a https://api.fr.cloud.gov --sso`)
- The space has access to the `aws-rds` service in the marketplace (`cf marketplace | grep aws-rds`)
- A route reserved for the Keycloak host, e.g. `auth-bench-keycloak.app.cloud.gov`
- `jq` and `curl` on your workstation for the post-deploy realm/client provisioning steps
- Strong bootstrap admin credentials generated locally (e.g. `openssl rand -base64 24`)

### Step 1 — Fill in local vars

```bash
cd auth-benchmark/keycloak
cp vars.example.yml vars.yml
# then edit vars.yml — set app_name, public_host, rds_service_name,
# bootstrap_admin_username, bootstrap_admin_password.
# DO NOT COMMIT vars.yml (it is already in the parent .gitignore pattern).
```

Example populated `vars.yml`:

```yaml
app_name: auth-bench-keycloak
public_host: auth-bench-keycloak.app.cloud.gov
rds_service_name: auth-bench-keycloak-db
bootstrap_admin_username: kc-bootstrap
bootstrap_admin_password: <output of `openssl rand -base64 24`>
```

### Step 2 — Provision the Postgres backing store

Keycloak is a stateful application and requires a Postgres database. On cloud.gov use the `aws-rds` brokered service. The `micro-psql` plan is sufficient for benchmark and low-traffic realms; step up to `medium-psql` or larger for production.

```bash
cf create-service aws-rds micro-psql auth-bench-keycloak-db
# wait for provisioning to complete (typically 5-15 minutes)
watch -n 15 'cf service auth-bench-keycloak-db | grep -E "status|last operation"'
```

Wait until `status: create succeeded` before proceeding.

### Step 3 — Push Keycloak

From the `auth-benchmark/` directory:

```bash
./bin/push-candidate.sh keycloak
```

This runs `cf push -f keycloak/manifest.yml --vars-file keycloak/vars.yml`. The manifest binds the `aws-rds` service, extracts credentials from `VCAP_SERVICES` at start time, and boots Keycloak in `start` (production) mode against Postgres.

Watch the first-boot logs:

```bash
cf logs auth-bench-keycloak --recent
```

First boot performs the Liquibase schema install against RDS; expect 60–120 seconds before the admin console responds. The manifest sets `timeout: 180` and probes `/realms/master` so `cf push` will wait it out cleanly.

### Step 4 — Verify readiness

```bash
curl -sSf https://auth-bench-keycloak.app.cloud.gov/realms/master >/dev/null && echo "master realm reachable"
curl -sS  https://auth-bench-keycloak.app.cloud.gov/health/ready | jq .
```

The `master` realm should return an OIDC discovery-shaped JSON body, and `/health/ready` should report `"status":"UP"`.

### Step 5 — First-login and rotate the bootstrap admin

1. Browse to `https://auth-bench-keycloak.app.cloud.gov/admin` and sign in with the bootstrap credentials from `vars.yml`.
2. In **master → Users**, create a new named admin user (bound to your work email), assign the `admin` role, and log out.
3. Sign back in as the named admin and **delete** or **disable** the bootstrap admin user.
4. Rotate `bootstrap_admin_password` in `vars.yml` to a fresh value so a redeploy cannot resurrect the throwaway account with the old password.

### Step 6 — Create a benchmark realm

Every non-master realm is where downstream apps get clients. Do not put benchmark clients in `master`.

Using the admin UI: **Add realm → name: `benchmark`** and save.

Or via the `kcadm.sh` CLI shipped inside the container:

```bash
cf ssh auth-bench-keycloak -c '
  /opt/keycloak/bin/kcadm.sh config credentials \
    --server http://127.0.0.1:$PORT \
    --realm master \
    --user "$KC_BOOTSTRAP_ADMIN_USERNAME" \
    --password "$KC_BOOTSTRAP_ADMIN_PASSWORD" &&
  /opt/keycloak/bin/kcadm.sh create realms -s realm=benchmark -s enabled=true
'
```

### Step 7 — Add Cloud.gov UAA as a brokered identity provider

In the `benchmark` realm, go to **Identity Providers → Add provider → OpenID Connect v1.0** and configure:

| Field | Value |
| --- | --- |
| Alias | `cloudgov-uaa` |
| Display name | `Cloud.gov UAA` |
| Discovery endpoint | `https://login.fr.cloud.gov/.well-known/openid-configuration` |
| Client authentication | `Client secret sent as post` |
| Client ID / Secret | Values from a `cloud-gov-identity-provider` service instance created for Keycloak's UAA callback URI: `https://auth-bench-keycloak.app.cloud.gov/realms/benchmark/broker/cloudgov-uaa/endpoint` |
| Default scopes | `openid profile email` |

Create the UAA service instance from the shell:

```bash
cf create-service cloud-gov-identity-provider oauth-client auth-bench-keycloak-uaa \
  -c '{"redirect_uri":["https://auth-bench-keycloak.app.cloud.gov/realms/benchmark/broker/cloudgov-uaa/endpoint"]}'
cf create-service-key auth-bench-keycloak-uaa key
cf service-key   auth-bench-keycloak-uaa key
# copy client_id and client_secret from the JSON output into the Keycloak IdP config
```

For Login.gov brokering, follow [`../LOGINGOV.md`](../LOGINGOV.md) — Login.gov requires `private_key_jwt`, which Keycloak supports natively under **Client authentication → JWT signed with private key**.

### Step 8 — Register downstream OIDC clients

For each app or auth-proxy under test, add a client in the `benchmark` realm:

- **Client ID**: e.g. `oauth2-proxy-benchmark`
- **Client type**: `OpenID Connect`
- **Client authentication**: `On` (confidential)
- **Standard flow**: enabled
- **Valid redirect URIs**: the app's callback (e.g. `https://auth-bench-oauth2-proxy.app.cloud.gov/oauth2/callback`)
- Under **Credentials**, copy the generated client secret into the downstream app's config

Downstream apps then point their OIDC discovery at `https://auth-bench-keycloak.app.cloud.gov/realms/benchmark/.well-known/openid-configuration`.

### Step 9 — Record moving parts in the scorecard

Log realm/client/IdP creation time, memory footprint (`cf app auth-bench-keycloak`), and any manual steps in `../scorecard.csv` under the `keycloak` row's `notes` column. Do not re-score other candidates as part of this exercise (out of scope per the maintainer handoff).

## Operational notes

- **Session persistence** — Keycloak stores sessions in the DB by default; horizontal scaling requires no sticky sessions once RDS-backed. For heavier loads, enable Infinispan remote cache (out of scope for the benchmark scaffold).
- **Cluster discovery** — with `instances: 1` there is no cluster to form. If you scale up (`cf scale -i N`), configure JGroups DB_PING (or the platform's KUBE_PING equivalent) — the reference `pic-blm-cxworks` module documents this.
- **TLS truststore** — the manifest sets `KC_TRUSTSTORE_PATHS` to `/etc/ssl/certs/ca-bundle.crt,/etc/cf-system-certificates` so outbound OIDC discovery to `login.fr.cloud.gov` and `secure.login.gov` validates cleanly.
- **Backup / restore** — RDS snapshots are the backup mechanism. Realm exports (`kcadm.sh export`) provide config-only backups and are recommended before any major realm surgery.
- **Upgrade path** — pin the image tag in production (e.g. `keycloak-server:26.0.7`) rather than `latest`. The reference Terraform module tags images per release.

## Why Keycloak is the recommended solution

Full rationale lives in [`../docs/candidates/keycloak.md`](../docs/candidates/keycloak.md) and the decision record at [`../docs/decision.md`](../docs/decision.md). In short:

- Full-featured IAM (federation, MFA, RBAC, OIDC / OAuth 2.0 / SAML 2.0) without vendor lock-in.
- Operates cleanly on cloud.gov (Docker image + `aws-rds`), matching the platform's supported patterns.
- Standards-based — downstream client apps stay portable.
- Actively maintained upstream, with a strong community and long support horizon.
- **Keycloak is currently used for USAi, PIC, and Touchpoints, and is used in actively authorized systems.**

