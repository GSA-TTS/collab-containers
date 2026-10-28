# CryptPad on cloud.gov

[CryptPad](https://github.com/cryptpad/cryptpad) is an end-to-end encrypted collaboration suite. This folder deploys the upstream image `cryptpad/cryptpad:version-2025.6.0` to cloud.gov.

**Status:** Working (see the status table in the [root README](../README.md)). Put it behind an auth proxy (oauth2-proxy) per the root README.

## Deploy

```bash
cf target -o <your-org> -s <space>
cd cryptpad
cf push -f manifest.yml
```

The manifest starts CryptPad through a generated `config.js` wrapper around the upstream `config.example.js`.

## Configuration

| Variable | Purpose | Notes |
|---|---|---|
| `NODE_ENV` | Runtime mode | `production` |
| `ADMIN_KEY` | CryptPad admin public key | The manifest ships the literal placeholder `${RANDOM_SECRET_KEY}`, which the wrapper ignores. Set a real value with `cf set-env` before relying on admin features. |
| `STORAGE_LIMIT` | Per-user storage quota (bytes) | `1800000000` |
| `BASE_URL` | Public origin | Must match the route in the manifest |
| `TRUST_PROXY` | Honor proxy headers | `"true"` |

Persistent state uses five volume mounts (`blob`, `block`, `customize`, `data`, `datastore`). The volume services named in the manifest must exist in your space before pushing.

## Known issues

- Uses the same origin for CryptPad's safe and unsafe origins (`BASE_URL`), which weakens the sandbox-domain isolation CryptPad normally expects. Review before storing sensitive material.
- The image is pinned to a release tag, not a digest, and is not built or scanned by this repository's workflows.
