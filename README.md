
# Collaboration Containers for Deployment on cloud.gov

> A collection of containerized open-source collaboration tools, optimized for deployment on cloud.gov with security scanning and two deployment options (from GHCR registry or local build).

**Status:** Public-release preparation is in progress. Current-file lint, Dockerfile lint, Trivy filesystem scan, and working-tree secret scanning pass. Git history remediation and release workflow verification are still required before making the repository public.

## 🚀 Quick Start

### For Users (Deploy Pre-Built Image)

```bash
# Pull and run (fastest, recommended for most users)
docker pull ghcr.io/gsa-tts/hedgedoc:v1.0.0
docker run -it ghcr.io/gsa-tts/hedgedoc:v1.0.0
```

### For Developers (Build Locally)

```bash
# Install mise (tool runner)
curl https://mise.jdx.dev/install.sh | sh

# Clone, build, and scan
git clone https://github.com/GSA-TTS/collab-containers.git
cd collab-containers
mise run container:build-all   # Build with security scanning
mise run scan:all              # Run all security checks
```

## 📖 Important Documentation

| Document | For | Purpose |
|----------|-----|---------|
| [**PUBLIC_RELEASE_GUIDE.md**](./PUBLIC_RELEASE_GUIDE.md) | Everyone | Overview of current capabilities, options, and remaining blockers |
| [**DEPLOYMENT.md**](./DEPLOYMENT.md) | Operators | Complete deployment guide: registry vs local build, security, production checklist |
| [**SECURITY.md**](./SECURITY.md) | Security teams | Vulnerability reporting, scanning practices, compliance standards |
| [**PUBLIC_READINESS_CHECKLIST.md**](./PUBLIC_READINESS_CHECKLIST.md) | Release managers | 100+ checklist items before public release, sign-off tracking |
| [**mise.toml**](./mise.toml) | Developers | 30+ runnable tasks for security scanning, building, signing containers |

**Start here:** [PUBLIC_RELEASE_GUIDE.md](./PUBLIC_RELEASE_GUIDE.md)

## Deployment Status

| App         | Status   | Auth Proxy Recommended | Last Failure (if any) | Directory Link |
|-------------|----------|------------------------|----------------------|----------------|
| [Marimo](https://github.com/marimo-team/marimo)      | ✅ Working | ✅ Yes (oauth2-proxy) |                      | [marimo](./marimo/) |
| [openvscode-server](https://github.com/gitpod-io/openvscode-server)  | ✅ Working | ✅ Yes (oauth2-proxy) |                      | [openVScode](./openVScode/) |
| [Excalidraw](https://github.com/excalidraw/excalidraw)  | ✅ Working | ✅ Yes (oauth2-proxy) |                      | [excalidraw](./excalidraw/) |
| [HedgeDoc](https://github.com/hedgedoc/hedgedoc)    | ✅ Working | 🚫 Not used (direct UAA OAuth2) |                      | [hedgedoc](./hedgedoc/) |
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

## Mise Tasks (Local Development)

Run security checks and build tasks using `mise`:

```bash
# Security & Compliance
mise run scan:all               # All security scans
mise run scan:secrets           # Gitleaks secret detection
mise run scan:dockerfile        # Hadolint linting
mise run scan:trivy-fs          # Trivy filesystem scan
mise run scan:trivy-container   # Trivy image scan

# Container Building
mise run container:build-all    # Build all images
mise run container:inspect      # Inspect built image

# SBOM & Signing
mise run sbom:generate          # Generate SPDX + CycloneDX
mise run sign:cosign-keygen     # Generate signing keys
mise run sign:cosign-image      # Sign container image

# CI/CD
mise run ci:pre-release-check   # Pre-release verification

# Help
mise run help:security          # Security scanning guide
mise run help:deployment        # Deployment options guide
```

See [mise.toml](./mise.toml) for all 30+ available tasks.

---

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

## Container Publishing and Security Scanning

This repository includes automated GitHub Actions workflows that:

1. **Discover** every top-level `Dockerfile`
2. **Build** each container image
3. **Scan** with multiple tools:
   - **Trivy** — Vulnerability, configuration, and secret scanning (SARIF)
   - **DockSec** — Comprehensive security analysis (JSON/HTML/CSV)
4. **Generate** Software Bill of Materials (SBOM)
   - SPDX format (industry standard)
   - CycloneDX format (OWASP standard)
5. **Publish** to GitHub Container Registry (GHCR)
6. **Attach** security reports to GitHub Releases

### Scanning Details

**Trivy Scanning:**
- Vulnerability detection (HIGH/CRITICAL severity)
- Configuration best practices
- Secret detection in images
- SARIF format for GitHub Security tab integration

**SBOM Generation:**
- All dependencies documented with versions
- Two formats for different compliance needs
- Transparency for software supply chain

**DockSec Analysis:**
- Dockerfile best practices
- Runtime security configuration
- Layer efficiency analysis

### Using Published Images

1. **Navigate to [Releases](https://github.com/GSA-TTS/collab-containers/releases)**
2. **Download security reports:**
   - `trivy-vulnerability-scan.sarif`
   - `sbom-spdx.json` / `sbom-cyclonedx.json`
   - `docksec-report.html` or `.json`
3. **Review findings** before production deployment
4. **Deploy after reviewing reports** using `docker pull ghcr.io/gsa-tts/<app>:<version>`

### How to Create a Release

1. Ensure GitHub Actions have permission to write packages and contents
2. Publish a GitHub release with a tag like `hedgedoc-v1.0.0`
3. Or run `publish-containers.yml` manually with version `1.0.0`
4. Review findings in workflow artifacts and per-container GitHub Release

### CI/CD Integration

- **Container Scan on PR** (`container-scan-on-pr.yml`)
  - Runs on Dockerfile/init.sh changes
  - Trivy + DockSec scans
  - Reports in artifacts and GitHub Security tab

- **Publish on Release** (`publish-containers.yml`)
  - Runs on GitHub release publish
  - Builds, scans, and publishes images
  - Attaches comprehensive security reports
  - Creates per-container release tags

---

## Deployment Options

### Option 1: Deploy from GHCR (Registry) — Recommended

✅ **Best for:** Most users, production deployments

```bash
# Pull pre-scanned image
docker pull ghcr.io/gsa-tts/hedgedoc:v1.0.0

# Deploy directly
docker run -p 3000:3000 ghcr.io/gsa-tts/hedgedoc:v1.0.0

# Or use cloud.gov manifest (pre-configured)
cf push hedgedoc
```

**Advantages:**
- Pre-scanned and verified
- No local build required
- Reproducible: same image every time
- SBOM and security reports available
- Faster deployment

### Option 2: Build Locally from Dockerfile

✅ **Best for:** Development, customization, advanced compliance needs

```bash
# Clone and build
git clone https://github.com/GSA-TTS/collab-containers.git
cd collab-containers/hedgedoc

# Build with security checks
docker build -t hedgedoc:local .

# Scan before deployment
trivy image hedgedoc:local

# Deploy
docker run -it hedgedoc:local
```

**Advantages:**
- Full control over build environment
- Can customize Dockerfile
- Review source code before building
- Sign images locally with Cosign
- Push to private registry

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed guides and examples.**

---

## Security & Compliance

### Standards Alignment

- ✅ **NIST SP 800-53** — Security controls for federal systems
- ✅ **NIST SP 800-218** — Secure software development
- ✅ **OWASP Top 10** — Web application security
- ✅ **CIS Benchmarks** — Container security hardening
- ✅ **SLSA Framework** — Software supply chain security

### Scanning Tools

- **Trivy** — Container vulnerability and secret scanning
- **DockSec** — Comprehensive security analysis
- **Gitleaks** — Git history secret detection
- **Grype** — Dependency vulnerability analysis
- **Hadolint** — Dockerfile best practices linting

See [SECURITY.md](./SECURITY.md) for vulnerability reporting and compliance details.

---

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
