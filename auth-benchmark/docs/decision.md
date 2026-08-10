# Decision Record — Auth Benchmark Winner

**Date:** 2026-08-10
**Status:** Accepted
**Scope:** Recommended identity solution for GSA federal application teams evaluated in this benchmark.

---

## Recommendation / Winner

> **Winner: Keycloak.**
> Selected as the recommended identity solution for GSA federal application teams evaluated in this benchmark. Also referred to as the **Recommended solution** to satisfy contexts that prefer non-competitive phrasing.

> **Keycloak is currently used for USAi, PIC, and Touchpoints, and is used in actively authorized systems.**

## Rationale

- Full-featured IAM (identity brokering, MFA, RBAC, protocol breadth across OIDC / OAuth 2.0 / SAML 2.0) without vendor lock-in.
- Operates cleanly on cloud.gov as a Docker-image `cf` app backed by `aws-rds` Postgres, matching the platform's supported patterns.
- Standards-based OIDC / OAuth 2.0 / SAML — downstream client apps stay portable across identity backends.
- Actively maintained upstream with a strong community and long support horizon.
- Production-proven inside GSA: currently powering **USAi, PIC, and Touchpoints** on actively authorized systems.

## Cross-references

- Reusable container image: [`ghcr.io/gsa-tts/terraform-cloudgov/keycloak-server:latest`](https://github.com/GSA-TTS/terraform-cloudgov/pkgs/container/terraform-cloudgov%2Fkeycloak-server)
- Reference Terraform module used by GSA production deployments: [`GSA-TTS/pic-blm-cxworks`](https://github.com/GSA-TTS/pic-blm-cxworks) — see `terraform/apps/auth`.
- In-flight Precogly example manifest: `precogly/manifest-keycloak.yml`.
- Deployment scaffolding: [`../keycloak/manifest.yml`](../keycloak/manifest.yml), [`../keycloak/README.md`](../keycloak/README.md).
- Full candidate write-up: [`candidates/keycloak.md`](./candidates/keycloak.md).

## Scope and boundaries

This decision covers the *identity solution for GSA federal application teams* — the platform teams choose to issue tokens, broker external IdPs (Cloud.gov UAA, Login.gov, SAML), and manage users.

It does **not** override the separate, narrower sidecar analysis in the top-level [Final Decision & Why Alternatives are Not Recommended](../README.md#final-decision--why-alternatives-are-not-recommended), which addresses *how a single collaboration container in this repository is fronted on cloud.gov* and continues to recommend `oauth2-proxy` there. The two are complementary: Keycloak is the recommended IAM authority; a thin proxy such as `oauth2-proxy` may still be used as the per-app gatekeeper that talks to Keycloak (or to UAA directly in constrained deployments).

## Non-changes

- The weighted `scorecard.csv` is intentionally **not** re-scored. It reflects thin-proxy criteria and remains valid on those axes.
- No candidate is removed. The benchmark remains a comparative artifact.
- No deployment code for other candidates is modified.

## Verbatim statement (do not paraphrase)

> **Keycloak is currently used for USAi, PIC, and Touchpoints, and is used in actively authorized systems.**
