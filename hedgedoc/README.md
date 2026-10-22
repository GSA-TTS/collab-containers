# HedgeDoc on cloud.gov with UAA OAuth2

[HedgeDoc](https://github.com/hedgedoc/hedgedoc) is an open-source collaborative markdown editor. This folder deploys HedgeDoc 1.10.8 as a Docker image on cloud.gov, backed by an `aws-rds` Postgres instance and authenticated directly against cloud.gov's platform UAA via OAuth2 (no separate auth proxy sidecar).

## Current status

- **Deployed in:** org `<your-org>`, space `dev`
- **Route:** `https://hedgedoc.app.cloud.gov`
- **Auth:** direct OAuth2 against cloud.gov UAA (`uaa.fr.cloud.gov`), not an auth-proxy sidecar
- **Database:** fresh `aws-rds` `micro-psql` instance (`hedgedoc-db`) — **no data carried over** from any prior deployment (see [Incident notes](#incident-notes-2026-09-14) below)

## Why `dev`, not `staging`

`hedgedoc` was originally deployed in the `staging` space. That deployment crash-looped on startup with:

```text
warn: Database cannot be reached. Try N of 30. (SequelizeConnectionRefusedError: connect ECONNREFUSED 10.x.x.x:5432)
```

Root cause: the `staging` space in this org is **missing the `trusted_local_networks_egress` security group binding on the `running` lifecycle**. Without it, apps in `staging` cannot reach any `10.x` internal address, including bound `aws-rds` instances — regardless of correct credentials in `VCAP_SERVICES`.

Binding a running security group is an org/space-manager-privileged, space-wide infrastructure change (`cf bind-running-security-group` failed with `You are not authorized to perform the requested action` for a non-privileged account). Rather than escalate privileges to make a space-wide network policy change, we redeployed to `dev`, which already has the correct `trusted_local_networks_egress` binding — matching every other RDS-backed app already running in this org (`precogly`, `precogly-auth`, etc.).

See `AGENTS.md` → *cloud.gov Networking Prerequisite* for the general diagnostic checklist this incident produced.

## Deploying from scratch

```bash
cf target -o <your-org> -s dev

# 1. Provision the database
cf create-service aws-rds micro-psql hedgedoc-db
# Wait for `cf service hedgedoc-db` to report "create succeeded" (~5-10 min)

# 2. Push the app
cd hedgedoc
cf push -f manifest.yml
```

The manifest's `command:` block extracts `DATABASE_URL` from `VCAP_SERVICES` at boot and writes a HedgeDoc config file with `ssl.rejectUnauthorized: false` (required for cloud.gov's `aws-rds` broker certificates). No manual `DATABASE_URL` configuration is needed as long as `hedgedoc-db` is bound via `services:` in the manifest.

## Setting up UAA OAuth2 login

The manifest sets the UAA endpoints (`CMD_OAUTH2_AUTHORIZATION_URL`, `CMD_OAUTH2_TOKEN_URL`, `CMD_OAUTH2_USER_PROFILE_URL`, etc.) but **does not** set `CMD_OAUTH2_CLIENT_ID` / `CMD_OAUTH2_CLIENT_SECRET` — those are per-deployment credentials issued by cloud.gov's `cloud-gov-identity-provider` broker and must not be committed to this repo.

HedgeDoc's OAuth2 callback route is fixed at `/auth/oauth2/callback` (see [`lib/web/auth/oauth2/index.js`](https://github.com/hedgedoc/hedgedoc/blob/1.10.8/lib/web/auth/oauth2/index.js) in the HedgeDoc source), so the redirect URI registered with cloud.gov must match the deployed route exactly.

```bash
cf target -o <your-org> -s dev

# 1. Create the identity provider service instance
cf create-service cloud-gov-identity-provider oauth-client hedgedoc-uaa

# 2. Create a service key with the exact callback route registered
cf create-service-key hedgedoc-uaa hedgedoc-uaa-key \
  -c '{"redirect_uri": ["https://hedgedoc.app.cloud.gov/auth/oauth2/callback"]}'

# 3. Retrieve the generated client_id / client_secret
cf service-key hedgedoc-uaa hedgedoc-uaa-key
```

Set the two values as app env vars — **do not** write them into `manifest.yml` or any other file in this repo:

```bash
cf set-env hedgedoc CMD_OAUTH2_CLIENT_ID "<client_id>"
cf set-env hedgedoc CMD_OAUTH2_CLIENT_SECRET "<client_secret>"
cf restart hedgedoc
```

Rotate credentials by deleting and recreating the service key (`cf delete-service-key`, then repeat step 2) — each service key mints an independent `client_id`/`client_secret` pair.

## Manifest notes

- `volume_mounts` for a `hedgedoc-data` NFS volume was removed from `manifest.yml`. The target space's marketplace has no volume/NFS service broker, and this mount is only used for local file uploads — notes and the database are unaffected.
- `PGSSLMODE=no-verify` and the manifest's inline `ssl.rejectUnauthorized: false` accommodate cloud.gov's `aws-rds` broker's self-signed-style certificate chain.

## Incident notes (2026-09-14)

The route `https://hedgedoc.app.cloud.gov/9l0qWQiZTJK6rr8hMZOHNQ` referenced in an earlier support request could not be recovered. An exhaustive search across every org and space reachable by the investigating account (7 orgs, 19 spaces) found:

- No `hedgedoc-db` or similarly-named database service instance anywhere
- One `hedgedoc` app shell in `<your-org>` / `staging`, but it had **no droplet, no packages ever staged, and no bound services** — i.e., it had never actually been deployed with a running container
- Only one audit log entry against that app GUID, from the investigation itself

Conclusion: the original database was either deleted outright (cloud.gov `aws-rds` deletions are not recoverable — there is no soft-delete) or was deployed under an org/space this account cannot access. The current deployment is a **new, empty HedgeDoc instance** with no relationship to any prior notes.
