# Planka on cloud.gov

[Planka](https://github.com/plankanban/planka) is a kanban board. This folder deploys `ghcr.io/plankanban/planka:2.2.1` to cloud.gov with Postgres and UAA OIDC login.

**Status:** Failing. The database resolves, but the cloud.gov SAML split-domain session cookie is stripped by the browser (SameSite). See the status table in the [root README](../README.md).

## Services and bindings

The manifest binds `planka-db` (`aws-rds`). OIDC credentials come from a `cloud-gov-identity-provider` instance named `planka-uaa`. The start command reads both from `VCAP_SERVICES` at boot.

```bash
cf target -o <your-org> -s <space>
cf create-service aws-rds micro-psql planka-db
cf create-service cloud-gov-identity-provider oauth-client planka-uaa
cd planka
cf push -f manifest.yml
```

Check the space's security groups first (see "cloud.gov Networking Prerequisite" in [`AGENTS.md`](../AGENTS.md)).

## Configuration

| Variable | Purpose |
|---|---|
| `BASE_URL` | Public URL |
| `OIDC_ISSUER`, `OIDC_USERNAME_ATTRIBUTE`, `OIDC_NAME_ATTRIBUTE` | UAA OIDC settings; client id/secret come from the `planka-uaa` binding |
| `SECRET_KEY` | Generated randomly on every start if unset. **Set a stable value** or sessions are invalidated on restart. |

Data volume: `planka-data` at `/app/data`.

## Known issues

- The start command patches `/app/api/hooks/oidc/index.js` to rewrite `uaa.fr.cloud.gov` to `login.fr.cloud.gov` in discovered OIDC metadata. The patch depends on Planka's file layout and may break on version changes. It does not fix the cookie issue above.
- Database TLS verification is disabled (`PGSSLMODE=no-verify`, `KNEX_REJECT_UNAUTHORIZED_SSL_CERTIFICATE=false`).
- The start command runs database migrations on every start.
- The image is pinned to a release tag, not a digest, and is not built or scanned by this repository's workflows.
