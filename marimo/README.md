# Marimo on cloud.gov

[Marimo](https://github.com/marimo-team/marimo) is a reactive Python notebook. This folder deploys `ghcr.io/marimo-team/marimo:0.25.2-sql` to cloud.gov.

**Status:** Working (see the status table in the [root README](../README.md)). Put it behind an auth proxy (oauth2-proxy) per the root README.

## Deploy

The admin password is a `((variable))` placeholder; supply it at push time and do not commit it.

```bash
cf target -o <your-org> -s <space>
cd marimo
cf push -f manifest.yml --var admin_password="$MARIMO_ADMIN_PASSWORD"
```

## Configuration

| Variable | Purpose |
|---|---|
| `MARIMO_ADMIN_USER` | Admin username (`admin`) |
| `MARIMO_ADMIN_PASSWORD` | Admin password (`((admin_password))`) |
| `MARIMO_TRUSTED_DOMAINS` | `marimo.app.cloud.gov` |
| `MARIMO_OVERWRITEHOST` / `MARIMO_OVERWRITEPROTOCOL` | Public host and protocol behind the router |

Volumes: `marimo-data` at `/data` and `marimo-config` at `/etc/marimo/marimo.toml`. [`marimo.toml.example`](./marimo.toml.example) shows the config file shape; replace its placeholder password before use.

## Known issues

- The image runs notebooks, which execute arbitrary Python for authenticated users. Treat every user as having code execution inside the container.
- The image is pinned to a release tag, not a digest, and is not built or scanned by this repository's workflows.
