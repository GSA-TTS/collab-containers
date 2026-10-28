# Outline on cloud.gov

[Outline](https://github.com/outline/outline) is a team knowledge base. This folder deploys `outlinewiki/outline:1.12.0` to cloud.gov with Postgres, Redis and UAA OIDC login.

**Status:** Failing. The GSA WAF blocks `/api/auth.config` with a 403 (dot-config rule). See the status table in the [root README](../README.md).

## Services and bindings

The manifest binds `outline-db` (`aws-rds`) and `outline-redis` (`aws-elasticache-redis`). Outline's OIDC credentials come from a `cloud-gov-identity-provider` instance named `outline-uaa`. The start command reads all of these from `VCAP_SERVICES` at boot.

```bash
cf target -o <your-org> -s <space>
cf create-service aws-rds micro-psql outline-db
cf create-service aws-elasticache-redis <plan> outline-redis
cf create-service cloud-gov-identity-provider oauth-client outline-uaa
cd outline
cf push -f manifest.yml
```

Check the space's security groups first (see "cloud.gov Networking Prerequisite" in [`AGENTS.md`](../AGENTS.md)).

## Configuration

| Variable | Purpose |
|---|---|
| `URL`, `FORCE_HTTPS` | Public URL and HTTPS enforcement |
| `OIDC_*` | cloud.gov UAA endpoints and claim mapping; client id/secret are read from the `outline-uaa` binding |
| `FILE_STORAGE`, `FILE_STORAGE_LOCAL_DIR` | Local file storage on the `outline-data` volume (`/data`) |
| `AWS_*` | **Placeholder values only.** Replace them with a real S3 bucket if you need uploads that do not use local storage. |
| `SECRET_KEY`, `UTILS_SECRET` | Generated randomly on every start if unset. **Set stable values** or sessions and signed URLs break on restart. |

## Known issues

- The start command patches Outline's built JavaScript (a hard-coded asset filename and a server route) to rewrite `auth.config` to `auth_config` and work around the WAF. The patch is tied to specific build output, so it can break on any Outline version change. It did not resolve the failure above.
- Database TLS verification is disabled (`DATABASE_REJECT_UNAUTHORIZED=false`).
- The image is pinned to a release tag, not a digest, and is not built or scanned by this repository's workflows.
