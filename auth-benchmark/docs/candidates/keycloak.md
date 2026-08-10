# Candidate write-up: Keycloak

> **Keycloak is currently used for USAi, PIC, and Touchpoints, and is used in actively authorized systems.**

Keycloak is the benchmark's **recommended identity solution** and the declared **winner** for GSA federal application teams. This document is the deep-dive companion to the top-level [`README.md`](../../README.md) and the [decision record](../decision.md).

## 1. Candidate matrix

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

## 2. Rationale

- **Full-featured IAM** — federation, MFA, RBAC, and protocol breadth (OIDC / OAuth 2.0 / SAML 2.0) without vendor lock-in. One authority handles browser flows, machine flows, and legacy SAML SPs.
- **Cloud.gov fit** — runs as a Docker-image `cf` app backed by `aws-rds` Postgres. The platform's supported patterns cover it end-to-end: brokered service, edge TLS, `X-Forwarded-*` handling.
- **Standards-based** — downstream client apps talk plain OIDC / OAuth 2.0 / SAML. Nothing is locked to Keycloak; if the authority is ever swapped, clients keep working.
- **Actively maintained upstream** — Red Hat–backed community, quarterly releases, a long support horizon, and an ecosystem of adapters and extensions.
- **Production-proven inside GSA** — **Keycloak is currently used for USAi, PIC, and Touchpoints, and is used in actively authorized systems.** This is the decisive evidence of production readiness within GSA.

## 3. Cross-references

- **Reusable container image**: [`ghcr.io/gsa-tts/terraform-cloudgov/keycloak-server:latest`](https://github.com/GSA-TTS/terraform-cloudgov/pkgs/container/terraform-cloudgov%2Fkeycloak-server)
- **Reference Terraform module used by GSA production deployments**: [`GSA-TTS/pic-blm-cxworks`](https://github.com/GSA-TTS/pic-blm-cxworks) — see `terraform/apps/auth`.
- **In-flight Precogly example manifest**: `precogly/manifest-keycloak.yml`.
- **Benchmark scaffolding**: [`../../keycloak/manifest.yml`](../../keycloak/manifest.yml), [`../../keycloak/vars.example.yml`](../../keycloak/vars.example.yml), [`../../keycloak/README.md`](../../keycloak/README.md).
- **Login.gov integration** (Scenario B, brokered identity): [`../../LOGINGOV.md`](../../LOGINGOV.md).

## 4. Evaluation against benchmark criteria

The weighted scorecard in [`../../scorecard.csv`](../../scorecard.csv) was designed around **thin auth-proxy** criteria (routing, transparency, policy expressiveness, sidecar operability). Keycloak scores lower on those axes by design — it is an IAM authority, not a sidecar — but wins the **overall benchmark** on the axis that matters most for federal application teams: it is the only candidate here that is already running behind FedRAMP-authorized systems at GSA.

| Criterion | How Keycloak measures up |
| --- | --- |
| Protocol support | OIDC + OAuth 2.0 + SAML 2.0 + Device Flow (best in field). |
| Federation | Native identity brokering — Cloud.gov UAA, Login.gov, GSA SAML, arbitrary OIDC. |
| MFA | Built-in TOTP, WebAuthn, recovery codes; per-realm and per-role policies. |
| RBAC | Realms → clients → roles → groups → composite roles → per-client mappers. |
| Cloud.gov operational fit | `cf push` a Docker image; bind `aws-rds`; no exotic services required. |
| Production readiness at GSA | **USAi, PIC, Touchpoints — actively authorized systems.** |
| Standards portability | Downstream clients speak plain OIDC; swappable authority. |
| Maintenance horizon | Active upstream, quarterly releases, large community. |

## 5. Trade-offs (do not ignore)

These are captured for completeness — none is a disqualifier at the recommended scope, but each should shape the deployment plan.

- **Resource footprint** — a single instance typically wants ~1 GB RAM and a warm-up period before serving traffic. Budget for it and use readiness probes (see `manifest.yml`).
- **Stateful dependency** — Keycloak requires Postgres (`aws-rds`). Plan snapshot/restore and realm exports as part of the runbook.
- **Not a reverse proxy** — Keycloak issues tokens; it does not front HTTP traffic to your app. Pair it with a thin OIDC client in each app (or an `oauth2-proxy` sidecar) to gate traffic.
- **Bootstrap admin hygiene** — the `KC_BOOTSTRAP_ADMIN_*` credentials in the manifest exist only to create the first named admin. Rotate them immediately after Step 5 of the bootstrap guide.
- **Upgrade discipline** — pin image tags in production. `latest` is fine for the benchmark scaffold and disallowed for authorized deployments.

## 6. Deployment scaffolding provided in this repo

- [`../../keycloak/manifest.yml`](../../keycloak/manifest.yml) — Cloud Foundry manifest with `aws-rds` binding, `X-Forwarded-*` handling, HTTP health check on `/realms/master`, and startup timeout tuned for first-boot Liquibase schema install.
- [`../../keycloak/vars.example.yml`](../../keycloak/vars.example.yml) — template for `vars.yml` (never commit the populated version).
- [`../../bin/push-candidate.sh`](../../bin/push-candidate.sh) — one-shot pusher: `./bin/push-candidate.sh keycloak`.
- [`../../keycloak/README.md`](../../keycloak/README.md) — end-to-end bootstrap guide (RDS provisioning → push → first-login → realm → IdP → clients).

## 7. Where this candidate lives in the wider decision

- **Overall IAM for GSA federal application teams** — Keycloak. Winner. This document.
- **Login.gov brokered identity** — Keycloak (Scenario B in `../../LOGINGOV.md`).
- **Thin single-container sidecar on cloud.gov** — `oauth2-proxy` remains the pragmatic pick in the collaboration-container context evaluated in the top-level [Final Decision](../../README.md#final-decision--why-alternatives-are-not-recommended). It composes cleanly *in front of* a Keycloak realm.

The two picks are complementary, not competing: Keycloak is the recommended IAM authority; `oauth2-proxy` remains a fine per-container gatekeeper that talks to it.
