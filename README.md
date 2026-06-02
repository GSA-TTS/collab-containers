
# Collaboration Containers for Deployment on cloud.gov

>Ephemeral/Short-lived for prototyping only

Each folder contains a `manifest.yml` file to deploy an ephemeral container on cloud.gov. 

## Deployment Status

| App         | Status   | Auth Proxy Recommended | Last Failure (if any) | Directory Link |
|-------------|----------|------------------------|----------------------|----------------|
| [Marimo](https://github.com/marimo-team/marimo)      | ✅ Working | ✅ Yes (oauth2-proxy) |                      | [marimo](./marimo/) |
| [openvscode-server](https://github.com/gitpod-io/openvscode-server)  | ✅ Working | ✅ Yes (oauth2-proxy) |                      | [openVScode](./openVScode/) |
| [Excalidraw](https://github.com/excalidraw/excalidraw)  | ✅ Working | ✅ Yes (oauth2-proxy) |                      | [excalidraw](./excalidraw/) |
| [HedgeDoc](https://github.com/hedgedoc/hedgedoc)    | ✅ Working | ✅ Yes (oauth2-proxy) |                      | [hedgedoc](./hedgedoc/) |
| [Outline](https://github.com/outline/outline)     | ❌ Failing | 🚫 Required (oauth2-proxy) | GSA WAF blocks `/api/auth.config` with a 403 (dot-config block rule). | [outline](./outline/) |
| [Planka](https://github.com/plankanban/planka)      | ❌ Failing | 🚫 Required (oauth2-proxy) | Database resolved, but Cloud.gov SAML split-domain session cookie is stripped by browser (SameSite block). | [planka](./planka/) |
| [CryptPad](https://github.com/xwiki-labs/cryptpad)    | ✅ Working | ✅ Yes (oauth2-proxy) |                      | [cryptpad](./cryptpad/) |
| [Backstage](https://github.com/backstage/backstage)  | ✅ Working | ✅ Yes (oauth2-proxy) |                      | [backstage](./backstage/) |
| Auth proxy benchmark | 🧪 Experimental | — | Cloud.gov UAA benchmark harness and proxy manifests. | [auth-benchmark](./auth-benchmark/) |

## Others?
[Create an Issue](https://github.com/GSA-TTS/collab-containers/issues/new) or Open a PR

## Steps to Deploy

1. Ensure you have the Cloud Foundry CLI installed and are logged into your cloud.gov account.
2. Navigate to this folder in your terminal.
3. Run the following command to deploy:
   ```bash
   cf login -a api.fr.cloud.gov --sso
   cd app-name  # Replace with the specific app folder, e.g., `hedgedoc`
   cf push
   ```
4. Access the application at the domain specified in the `CMD_DOMAIN` environment variable.

## Benchmarking Auth Proxies

Use [auth-benchmark](./auth-benchmark/) to compare UAA-backed auth proxies in front of fixture apps or any of the deployed collaboration containers in this repository.

## Container Publishing and Findings

This repository includes GitHub Actions workflows to discover every top-level `Dockerfile`, build each container image, scan it with DockSec, and publish it to `ghcr.io`.

- `publish-containers.yml` runs on published GitHub releases or manual dispatch.
- Each discovered container is pushed to `ghcr.io/<owner>/<container>:<version>` and `:latest`.
- DockSec runs in `scan_only` mode by default, so it does not require an LLM API key.
- DockSec findings are saved as workflow artifacts and attached to each per-container release as JSON, HTML, and CSV reports.
- The workflow creates a GitHub Release per container, using tags like `<container>-v1.2.3`, and attaches the DockSec reports.

### How to use it

1. Ensure Actions have permission to write packages and contents in the repository settings.
2. Publish a repository release with a tag like `v1.2.3`, or run the workflow manually and provide `1.2.3` as `release_version`.
3. Review findings in the workflow artifacts and in the per-container GitHub Releases.

## Centralized Scanning Service

This repo is set up for the GSA-TTS centralized scanning service.

- `renovate.json` extends `local>GSA-TTS/scanning-service:default.json5`.
- `.github/workflows/dependency-lint.yml` adds the org dependency lint PR check in advisory mode.
- `.github/workflows/secret-scan.yml` adds the org secret scan PR check in advisory mode.
- `.githooks/pre-commit` runs `gitleaks detect --staged` for local secret scanning.

### Remaining manual onboarding steps

1. Merge the Renovate onboarding PR if it has not already been merged for this repo.
2. Review and merge the follow-up Renovate PR that pins mutable GitHub Action refs to full SHAs.
3. Delete `.github/dependabot.yml` if it exists.
4. In GitHub settings, disable Dependabot security updates but keep Dependabot alerts enabled.
5. If this repo still has a repo-local vulnerability SLA workflow, delete it after confirming the centralized tracker is active.
6. Optionally download the org `.gitleaks.toml` into the repo root if you want local gitleaks runs to use the shared org config.

### Pre-commit hook setup

```bash
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

## License
This project is licensed under the CC0 1.0 Universal (CC0 1.0) Public Domain Dedication. You can copy, modify, distribute, and perform the work, even for commercial purposes, all without asking permission. For more information, please visit [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
