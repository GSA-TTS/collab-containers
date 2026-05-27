# Authentik in this benchmark

Authentik belongs in this benchmark, but not in the same automation lane as `oauth2-proxy` and `pomerium`.

Why:

- Authentik is a full identity platform, not just a lightweight OIDC auth gate.
- On Cloud.gov it is deployable, but the meaningful benchmark setup happens after deployment: add Cloud.gov UAA as an auth source, create the proxy provider, and attach an application.
- The embedded outpost in the server container is enough for the benchmark, so an external proxy outpost is optional.

## Recommended Cloud.gov deployment shape

- `authentik-server`: `ghcr.io/goauthentik/server:latest`
- `authentik-worker`: `ghcr.io/goauthentik/server:latest` with `worker` command
- `authentik-db`: `aws-rds` `small-psql` or `micro-psql`

Required core env:

- `AUTHENTIK_SECRET_KEY`
- `AUTHENTIK_POSTGRESQL__HOST`
- `AUTHENTIK_POSTGRESQL__PORT`
- `AUTHENTIK_POSTGRESQL__USER`
- `AUTHENTIK_POSTGRESQL__PASSWORD`
- `AUTHENTIK_POSTGRESQL__NAME`
- `AUTHENTIK_POSTGRESQL__SSLMODE=require`
- `AUTHENTIK_LISTEN__HTTP=0.0.0.0:${PORT}`

## Why this repo does not auto-push Authentik

The benchmark would be misleading if the repo pretended Authentik were fully configured by only pushing containers. The differentiator for Authentik is the provider and source model, and those objects must be created after first boot.

## Manual benchmark bootstrap

1. Push the server and worker apps with the Postgres service bound.
2. Complete the initial admin bootstrap.
3. Add Cloud.gov UAA as a generic OAuth or OIDC source using the bound `cloud-gov-identity-provider` service credentials.
4. Create a proxy provider for the protected public hostname.
5. Attach the provider to an application.
6. Point the provider at either the fixture route or one of the collaboration container routes.
7. Record the extra moving parts and setup time in `../scorecard.csv`.

This keeps Authentik in the experiment without overstating how universal or operationally light it is for the Cloud.gov UAA use case.
