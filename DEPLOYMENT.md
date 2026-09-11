# Deployment Guide: collab-containers

This document provides guidance for deploying collab-containers in production, with options for registry-based deployment and local builds, along with security verification steps.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Deployment Options](#deployment-options)
3. [Security Scanning](#security-scanning)
4. [Container Signing](#container-signing)
5. [Cloud.gov Deployment](#cloudgov-deployment)
6. [Production Checklist](#production-checklist)

---

## Quick Start

### Prerequisites

- Docker CLI or compatible container runtime (Podman, Colima, etc.)
- `curl` and `jq` for registry interactions (optional, for advanced workflows)
- `cosign` CLI (optional, for signature verification)
- `mise` (optional, for using the built-in task runner)

### Deploy from GHCR (Recommended for Most Users)

```bash
# Pull the latest published image
docker pull ghcr.io/gsa-tts/<app-name>:latest

# Or pull a specific version
docker pull ghcr.io/gsa-tts/<app-name>:v1.0.0

# Run the container
docker run -it --rm -p 3000:3000 ghcr.io/gsa-tts/<app-name>:latest
```

**Advantages:**
- ✅ Pre-scanned and verified (Trivy + DockSec)
- ✅ No local build required
- ✅ Minimal supply chain risk
- ✅ Reproducible: image hash matches published version
- ✅ GitHub Release includes SBOM and security reports

### Build Locally (Advanced/Development)

```bash
# Clone the repository
git clone https://github.com/GSA-TTS/collab-containers.git
cd collab-containers

# Install mise (one-time)
curl https://mise.jdx.dev/install.sh | sh

# Build all containers with security checks
mise run container:build-all

# Or build a specific container
docker build -t local/hedgedoc:latest ./hedgedoc
```

**Advantages:**
- ✅ Full control over build environment
- ✅ Can customize Dockerfile before build
- ✅ Suitable for forks and customizations
- ✅ Can sign images locally
- ✅ Can push to private registries

---

## Deployment Options

### Option 1: Deploy from Docker Registry (GHCR) — Recommended

**Best for:** Most production deployments, organizations with network isolation, minimal infrastructure

#### Process

1. **Verify image signature** (optional but recommended)
   ```bash
   cosign verify --key cosign.pub ghcr.io/gsa-tts/hedgedoc:v1.0.0
   ```

2. **Review security reports**
   - Visit GitHub Release: https://github.com/GSA-TTS/collab-containers/releases/tag/hedgedoc-v1.0.0
   - Download and review:
     - `trivy-vulnerability-scan.sarif`
     - `sbom-spdx.json`
     - `docksec-report.html` or `docksec-report.json`

3. **Deploy to cloud.gov**
   ```bash
   cf push hedgedoc
   # Uses manifest.yml with image reference
   ```

4. **Deploy to Kubernetes**
   ```yaml
   apiVersion: v1
   kind: Pod
   metadata:
     name: hedgedoc
   spec:
     containers:
     - name: hedgedoc
       image: ghcr.io/gsa-tts/hedgedoc:v1.0.0
       imagePullPolicy: IfNotPresent
   ```

5. **Deploy to Docker Swarm/Compose**
   ```yaml
   version: '3.8'
   services:
     hedgedoc:
       image: ghcr.io/gsa-tts/hedgedoc:v1.0.0
       ports:
         - "3000:3000"
       environment:
         - CMD_DOMAIN=hedgedoc.example.com
   ```

#### Registry Authentication

If your registry is private or requires authentication:

```bash
# For GHCR (GitHub Container Registry)
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USER --password-stdin

# For other registries
docker login <registry-url>
```

#### Scanning Deployed Images

```bash
# After pulling, scan locally
docker pull ghcr.io/gsa-tts/hedgedoc:v1.0.0
trivy image ghcr.io/gsa-tts/hedgedoc:v1.0.0

# Or use Trivy to scan remotely (no pull needed)
trivy image --remote-only ghcr.io/gsa-tts/hedgedoc:v1.0.0
```

---

### Option 2: Build Locally from Dockerfile

**Best for:** Custom deployments, development, private registries, compliance requirements

#### Process

1. **Clone and navigate**
   ```bash
   git clone https://github.com/GSA-TTS/collab-containers.git
   cd collab-containers/hedgedoc
   ```

2. **Review and optionally customize Dockerfile**
   ```bash
   cat Dockerfile
   # Edit if needed: vi Dockerfile
   ```

3. **Build with security checks**
   ```bash
   # Option A: Using mise (recommended)
   mise run container:build-all

   # Option B: Using Docker directly
   docker build -t myregistry.azurecr.io/hedgedoc:v1.0.0 -f Dockerfile .
   docker build -t hedgedoc:local .

   # Option C: Using docker buildx for multi-platform
   docker buildx build \
     --platform linux/amd64,linux/arm64 \
     -t myregistry.azurecr.io/hedgedoc:v1.0.0 \
     --push \
     .
   ```

4. **Scan before deployment**
   ```bash
   # Scan the locally built image
   trivy image hedgedoc:local

   # Generate SBOM
   syft hedgedoc:local -o spdx-json > sbom.json

   # Or use mise
   mise run scan:trivy-container hedgedoc
   mise run sbom:generate hedgedoc
   ```

5. **Sign the image** (optional but recommended for supply chain security)
   ```bash
   # Generate keys (one-time)
   mise run sign:cosign-keygen

   # Tag and push
   docker tag hedgedoc:local myregistry.azurecr.io/hedgedoc:v1.0.0
   docker push myregistry.azurecr.io/hedgedoc:v1.0.0

   # Sign
   cosign sign --key cosign.key myregistry.azurecr.io/hedgedoc:v1.0.0
   ```

6. **Deploy from your registry**
   ```bash
   docker pull myregistry.azurecr.io/hedgedoc:v1.0.0
   docker run -it myregistry.azurecr.io/hedgedoc:v1.0.0
   ```

---

## Security Scanning

### Comprehensive Security Checks

Every image undergoes scanning at release time:

1. **Trivy** — Vulnerability, configuration, and secret scanning
   - Container image analysis
   - Filesystem vulnerability detection
   - Configuration best practices
   - Secret detection

2. **DockSec** — Comprehensive security analysis
   - Dockerfile best practices
   - Runtime security configuration
   - Layer analysis
   - Supply chain assessment

3. **Gitleaks** — Git history secret detection
   - Prevents secrets in source code
   - Pre-commit hook integration

4. **SBOM Generation** — Software Bill of Materials
   - SPDX format (standard)
   - CycloneDX format (alternative)
   - Full dependency transparency

### Running Local Scans

Using mise:

```bash
# Quick secret scan
mise run scan:secrets

# Scan Dockerfiles
mise run scan:dockerfile

# Filesystem vulnerability scan
mise run scan:trivy-fs

# All scans at once
mise run scan:all

# Generate SBOM
mise run sbom:generate hedgedoc
```

### Interpreting Scan Results

#### Trivy SARIF Report

SARIF files can be uploaded to GitHub or analyzed with SARIF viewers:

```bash
# View in GitHub UI automatically (if using GitHub Actions)
# Or convert to human-readable format
trivy image ghcr.io/gsa-tts/hedgedoc:v1.0.0 --format json | jq '.Results[] | select(.Severity=="CRITICAL")'
```

#### DockSec Report

- **HTML Report** — Visual analysis with recommendations
- **JSON Report** — Machine-readable findings
- **CSV Report** — Spreadsheet-compatible results

#### SBOM Files

- **SPDX** — Widely recognized format
- **CycloneDX** — OWASP standard, better for dependency analysis

---

## Container Signing

### Why Sign Images?

- ✅ Verifies image hasn't been tampered with
- ✅ Proves provenance (who published it)
- ✅ Meets compliance requirements
- ✅ Enables policy enforcement (cosign/Sigstore integration)
- ✅ Supports SLSA provenance attestation

### Verify Published Image Signature

```bash
# Requires cosign (install: https://docs.sigstore.dev/cosign/installation)
cosign verify --key cosign.pub ghcr.io/gsa-tts/hedgedoc:v1.0.0
```

### Sign Your Custom Build

```bash
# Generate keys (one-time, keep private key safe)
mise run sign:cosign-keygen

# Push image to registry
docker tag hedgedoc:local myregistry.azurecr.io/hedgedoc:v1.0.0
docker push myregistry.azurecr.io/hedgedoc:v1.0.0

# Sign it
mise run sign:cosign-image myregistry.azurecr.io/hedgedoc:v1.0.0

# Verify locally
mise run sign:cosign-verify myregistry.azurecr.io/hedgedoc:v1.0.0
```

### Enforce Signature Verification in Kubernetes

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: image-signature-validation
webhooks:
- name: verify-signature.example.com
  admissionReviewVersions: ["v1"]
  clientConfig:
    service:
      name: policy-webhook
      namespace: default
      path: "/verify"
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
```

---

## Cloud.gov Deployment

### cloud.gov Manifests

Each app includes a `manifest.yml` for cloud.gov deployment:

```yaml
---
applications:
  - name: hedgedoc
    image: ghcr.io/gsa-tts/hedgedoc:v1.0.0  # Reference published image
    memory: 512M
    disk_quota: 2G
    env:
      CMD_DOMAIN: hedgedoc.cloud.gov
      CMD_PROTOCOL_USESSL: true
    services:
      - hedgedoc-db
```

### Deploy with security scanning

```bash
# 1. Update manifest.yml with latest image
vi hedgedoc/manifest.yml

# 2. Run pre-deployment checks
mise run ci:pre-release-check

# 3. Login to cloud.gov
cf login -a api.fr.cloud.gov --sso

# 4. Deploy
cd hedgedoc
cf push

# 5. Monitor
cf logs hedgedoc
```

### Verify Deployment

```bash
# Check status
cf apps

# View logs
cf logs hedgedoc --recent

# SSH into running container (advanced troubleshooting)
cf ssh hedgedoc
```

---

## Production Checklist

Before deploying to production, verify:

### Security & Compliance

- [ ] **Image scanned with Trivy** — No CRITICAL vulnerabilities
  ```bash
  trivy image ghcr.io/gsa-tts/hedgedoc:v1.0.0 --severity CRITICAL
  ```

- [ ] **SBOM present** — Review dependencies in `sbom-spdx.json`
  ```bash
  # Verify no high-risk licenses
  syft ghcr.io/gsa-tts/hedgedoc:v1.0.0 | grep -E "(GPL|AGPL)"
  ```

- [ ] **DockSec report reviewed** — No critical findings
  - Check `docksec-report.html` or `docksec-report.json`
  - Resolve any security recommendations

- [ ] **No secrets in code** — Gitleaks scan passed
  ```bash
  gitleaks detect --source local
  ```

- [ ] **Image signed** (optional but recommended)
  ```bash
  cosign verify --key cosign.pub ghcr.io/gsa-tts/hedgedoc:v1.0.0
  ```

- [ ] **Dockerfile reviewed** — Hadolint passed
  ```bash
  hadolint Dockerfile
  ```

### Operational

- [ ] **Environment variables documented** — All configs defined
- [ ] **Resource limits set** — Memory and disk quotas specified
- [ ] **Health checks configured** — Liveness and readiness probes
- [ ] **Logging enabled** — All output captured and forwarded
- [ ] **Secrets management configured** — No hardcoded credentials
- [ ] **Network policies defined** — Ingress/egress rules configured
- [ ] **Backups enabled** — Data persistence plan documented
- [ ] **Monitoring alerts configured** — Error and performance thresholds

### Compliance & Audit

- [ ] **ATO approval obtained** (if required by your agency)
- [ ] **Release notes published** — On GitHub Releases page
- [ ] **Security reports attached** — SBOM and scan results
- [ ] **Deployment logged** — Audit trail captured
- [ ] **Change approved** — Through your review process
- [ ] **Rollback plan documented** — How to revert if needed

### Post-Deployment

- [ ] **Smoke tests passed** — Basic functionality verified
- [ ] **Integration tests passed** — With dependent services
- [ ] **Performance baseline established** — Load testing complete
- [ ] **Team notified** — Stakeholders aware of deployment
- [ ] **Runbook updated** — Operational procedures current
- [ ] **On-call prepared** — Support team briefed

---

## Hardening & Optimization

### Minimal Image Size

Smaller images = fewer attack vectors and faster deployments.

**For production, prefer:**
- Alpine base images: `alpine:3.18`
- Distroless images: `gcr.io/distroless/base`
- Scratch images: For Go/Rust binaries

**Example optimization:**

```dockerfile
# Before: 500MB
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y nodejs
RUN npm install -g npm@latest
COPY app .
RUN npm install
CMD ["node", "app.js"]

# After: 50MB
FROM node:20-alpine
COPY app .
RUN npm ci --only=production
CMD ["node", "app.js"]
```

### Security Hardening

```dockerfile
# Run as non-root
RUN useradd -m -u 1000 appuser
USER appuser

# Remove shell (if not needed)
FROM gcr.io/distroless/nodejs20-debian11

# Read-only filesystem
RUN chmod -R a-w /app

# No setuid/setgid
RUN find / -perm /4000 -delete 2>/dev/null || true
```

### Scanning for hardening opportunities

```bash
# Analyze layers
mise run container:dive-analysis hedgedoc

# Check for security issues
hadolint Dockerfile
```

---

## Troubleshooting

### Image won't pull

```bash
# Check authentication
docker login ghcr.io

# Verify image exists and is public/accessible
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/packages/container/hedgedoc/versions

# Check registry logs
docker pull ghcr.io/gsa-tts/hedgedoc:v1.0.0 --verbose
```

### Container fails to start

```bash
# Check logs from build
docker run --rm ghcr.io/gsa-tts/hedgedoc:v1.0.0 /bin/sh -c "echo hello"

# Inspect image config
docker inspect ghcr.io/gsa-tts/hedgedoc:v1.0.0 | jq '.[] | {Cmd, Entrypoint, Env}'

# Test with different user
docker run --user root ghcr.io/gsa-tts/hedgedoc:v1.0.0
```

### Scan shows vulnerabilities

```bash
# Review full report
trivy image ghcr.io/gsa-tts/hedgedoc:v1.0.0 --format json | jq '.Results'

# Filter by severity
trivy image ghcr.io/gsa-tts/hedgedoc:v1.0.0 --severity CRITICAL,HIGH

# Update base image or dependencies
# Then rebuild and rescan
```

---

## References

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Cosign Signing](https://docs.sigstore.dev/cosign/installation/)
- [SBOM Formats](https://cyclonedx.org/)
- [Cloud.gov Documentation](https://cloud.gov/docs/)
- [SLSA Framework](https://slsa.dev/)
- [NIST Software Supply Chain Security](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5)
