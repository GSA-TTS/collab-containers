# Etherpad on cloud.gov

[Etherpad](https://github.com/ether/etherpad) is a real-time collaborative text editor. This folder deploys the upstream image `etherpad/etherpad:3.3.12` to cloud.gov.

**Status:** Untested. Etherpad is not listed in the root README status table and has no recorded deployment result.

## Deploy

The manifest uses `((variable))` placeholders, so supply values at push time. Do not commit them.

```bash
cf target -o <your-org> -s <space>
cd etherpad-lite
cf push -f manifest.yml \
  --var admin_password="$ETHERPAD_ADMIN_PASSWORD" \
  --var db_host="<db-host>" \
  --var db_user="<db-user>" \
  --var db_password="$ETHERPAD_DB_PASSWORD"
```

A Postgres database named `etherpad` must already exist.

## Configuration

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | Admin UI password (`((admin_password))`) |
| `DB_TYPE` / `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | Postgres connection (`DB_HOST`, `DB_USER`, `DB_PASS` are placeholders) |
| `DEFAULT_PAD_TEXT` | Text for new pads |
| `DISABLE_IP_LOGGING` | `"true"` |
| `TRUST_PROXY` | `"true"` |

Pad data volume: `etherpad-data` mounted at `/opt/etherpad-lite/var`.

## Known issues

- The manifest maps `etherpad.app.cloud.gov`; change the route if that is not your domain.
- Database TLS settings are not configured in the manifest. Verify how your cloud.gov RDS broker expects Etherpad to connect.
- The image is pinned to a release tag, not a digest, and is not built or scanned by this repository's workflows.
