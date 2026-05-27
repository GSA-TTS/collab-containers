# Keycloak in this benchmark

This benchmark includes Keycloak in the same role used by `pic-blm-cxworks`: a Cloud.gov-hosted OIDC authority and identity broker in front of downstream applications.

## What Keycloak measures

Keycloak is not a thin auth proxy. It is the benchmark candidate for the brokered-identity pattern:

- a stable OIDC issuer for downstream apps
- external identity providers brokered through Keycloak
- longer-lived sessions and richer authorization controls than direct-UAA app clients

## Cloud.gov deployment shape

The scaffold here mirrors the pattern from `pic-blm-cxworks`:

- run Keycloak behind Cloud Foundry edge TLS termination
- trust `X-Forwarded-*` headers
- derive Postgres credentials from `VCAP_SERVICES`
- bind an `aws-rds` Postgres service

## Important benchmark distinction

Keycloak belongs in the benchmark, but in a different cohort than `oauth2-proxy` and `pomerium`.

- `oauth2-proxy` and `pomerium` are direct application-fronting candidates
- `keycloak` is the candidate for centralizing auth and brokering Cloud.gov UAA before apps ever see an identity provider

## Manual post-deploy steps

1. Push Keycloak with its RDS binding.
2. Log into the admin console.
3. Create a realm for the benchmark.
4. Add Cloud.gov UAA as an external OIDC identity provider.
5. Add downstream OIDC clients for each app or proxy being tested.
6. Record the added setup time and moving parts in `../scorecard.csv`.

That gives you a fair comparison between direct-UAA proxying and the Keycloak-broker pattern already used by the related project.
