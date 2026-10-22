# Public Release Guide

## Overview

This guide walks through the complete process of preparing collab-containers for public release, with emphasis on security scanning, compliance, and deployment flexibility.

**Status:** Public-release preparation is in progress. Current-file lint, Dockerfile lint, Trivy filesystem scan, and Gitleaks working-tree scan pass. Historical Gitleaks findings were accepted through a fingerprint-scoped security review. Do not make the repository public until release workflows complete successfully and required GitHub repository settings and sign-offs are verified.

---

## What's Included

### Core Capabilities

1. **Multi-Option Deployment**
   - Deploy from GitHub Container Registry (GHCR) — recommended for most users
   - Build locally from Dockerfile — for customization and advanced use cases
   - Both methods supported with comprehensive documentation

2. **Comprehensive Security Scanning**
   - Trivy: Container vulnerability, configuration, secret scanning
   - Gitleaks: Git history secret detection
   - Grype: Dependency vulnerability analysis
   - Hadolint: Dockerfile best practices linting
   - SBOMs: SPDX and CycloneDX formats for supply chain transparency

3. **Federal Compliance**
   - Aligns with NIST SP 800-53, 800-218, and AI RMF
   - Cloud.gov compatible
   - GSA-TTS standards (Renovate integration, scanning service)
   - Coordinated disclosure policy for vulnerabilities

4. **Automated CI/CD Pipeline**
   - Security scanning on every PR
   - Automated container builds and GHCR publish on release
   - GitHub Security tab integration
   - SBOM and scan reports attached to releases

---

## Quick Start

### For Users (Deploy Pre-Built Images)

```bash
# Pull and run (recommended)
docker pull ghcr.io/gsa-tts/hedgedoc:v1.0.0
docker run -it ghcr.io/gsa-tts/hedgedoc:v1.0.0

# Review security before deploying to production
# See DEPLOYMENT.md → Production Checklist
```

**Time required:** < 2 minutes
**Security:** Use only after reviewing the release's Trivy and SBOM artifacts.

### For Developers (Build Locally)

```bash
# Install mise
curl https://mise.jdx.dev/install.sh | sh

# Clone repo
git clone https://github.com/GSA-TTS/collab-containers.git
cd collab-containers

# Run security checks
mise run scan:all

# Build with security scanning
mise run container:build-all

# Review results and deploy
docker run -it local/hedgedoc:latest
```

**Time required:** 5-15 minutes (includes downloads and builds)
**Security:** Full control, can inspect and customize

### For Release Managers (Create Release)

```bash
# 1. Run pre-release checks
mise run ci:pre-release-check

# 2. Verify all scans pass
# (see GitHub Actions run results)

# 3. Create the shared release tag
git tag v1.0.0
git push origin v1.0.0

# 4. Monitor publish-containers.yml workflow
# (GitHub Actions automatically builds and publishes)

# 5. Review attached security reports
# (on GitHub Release page)
```

**Time required:** 10-20 minutes
**Outcome:** Published to GHCR, all scans attached, release documented

---

## Documentation Structure

### For Different Roles

| Role | Start Here | Then Read | Reference |
|------|-----------|-----------|-----------|
| **User/Deployer** | [README.md](./README.md) | [DEPLOYMENT.md](./DEPLOYMENT.md) | [App READMEs](./hedgedoc/README.md) |
| **Developer** | [README.md](./README.md) | [mise.toml](./mise.toml) | Specific app README |
| **Release Manager** | [PUBLIC_READINESS_CHECKLIST.md](./PUBLIC_READINESS_CHECKLIST.md) | [DEPLOYMENT.md](./DEPLOYMENT.md) | GitHub Actions workflows |
| **Security/Compliance** | [SECURITY.md](./SECURITY.md) | [PUBLIC_READINESS_CHECKLIST.md](./PUBLIC_READINESS_CHECKLIST.md) | Scan reports |
| **Contributor** | [CONTRIBUTING.md](./CONTRIBUTING.md) (if exists) | [SECURITY.md](./SECURITY.md) | [AGENTS.md](./AGENTS.md) |

---

## Key Files & Their Purpose

### Configuration & Tools

- **`mise.toml`** — Task runner configuration with 30+ security and deployment tasks
- **`trivy.yaml`** — Vulnerability scanner configuration
- **`.gitleaks.toml`** — Secret detection patterns
- **`renovate.json`** — Automated dependency updates (extends GSA-TTS config)
- **`.github/workflows/`** — CI/CD pipelines for scanning and publishing

### Documentation

- **`README.md`** — Deployment overview, status table, quick steps
- **`DEPLOYMENT.md`** — Complete deployment guide (both options, security, production checklist)
- **`SECURITY.md`** — Vulnerability reporting, scanning practices, compliance
- **`PUBLIC_READINESS_CHECKLIST.md`** — 100+ checklist items for release verification
- **`AGENTS.md`** — AI agent behavioral rules (if using agentic tooling)

### Per-App

- Each app directory contains:
  - `Dockerfile` (if containerized)
  - `manifest.yml` (for cloud.gov deployment)
  - `README.md` (app-specific documentation)
  - Config files (`vars.example.yml`, `app-config.*.yaml`, etc.)

---

## Security Scanning Overview

### Automatic Scanning

Every container is scanned automatically:

1. **On Pull Request** → `container-scan-on-pr.yml`
   - Trivy vulnerability scan (SARIF format)
   - Results in artifacts and GitHub Security tab

2. **On Release** → `publish-containers.yml`
   - Trivy scan with SARIF
   - SBOM generation (SPDX + CycloneDX)
   - Reports attached to GitHub Release

### Manual Local Scanning

```bash
mise run scan:all                    # All scans
mise run scan:secrets               # Secret detection
mise run scan:dockerfile            # Dockerfile linting
mise run scan:trivy-fs              # Filesystem scan
mise run scan:trivy-container <img> # Image scan
```

### Understanding Results

- **Trivy SARIF** — Vulnerability report (upload to GitHub)
- **SBOM files** — All dependencies and versions (transparency)
- **Gitleaks** — Secret detection (should show "No secrets found")
- **Hadolint** — Dockerfile best practices

---

## Deployment Options Comparison

| Feature | GHCR (Registry) | Local Build |
|---------|---|---|
| **Prerequisites** | Docker CLI | Docker + git + mise |
| **Time to run** | 2 minutes | 10-15 minutes |
| **Customization** | Limited (image as-is) | Full (can edit Dockerfile) |
| **Security verification** | Pre-scanned by us | You run scans |
| **Registry control** | GitHub (public) | Your choice |
| **Supply chain risk** | Lower (use our scan reports) | Higher (you verify) |
| **Recommended for** | Most users, production | Development, customization |

---

## Production Deployment Checklist

Before deploying to production, verify:

✅ **Security**
- [ ] Trivy scan shows no CRITICAL vulnerabilities
- [ ] SBOM reviewed for risky dependencies
- [ ] No hardcoded secrets or credentials

✅ **Operations**
- [ ] Environment variables documented
- [ ] Resource limits configured
- [ ] Health checks working
- [ ] Logs being captured

✅ **Compliance**
- [ ] Appropriate approvals obtained
- [ ] Vulnerability disclosure policy understood
- [ ] Support/maintenance expectations clear
- [ ] Known issues documented

See full checklist: [DEPLOYMENT.md → Production Checklist](./DEPLOYMENT.md#production-checklist)

---

## Continuous Security

### Automated Updates

Renovate automatically creates PRs for:
- Security updates (prioritized)
- Dependency updates (weekly)
- GitHub Action updates

Each PR triggers security scans.

### Monitoring

Follow these to stay informed:

1. **GitHub Repository** — Watch for security advisories
2. **GitHub Security Tab** — View active Trivy scans
3. **Release Announcements** — Subscribe to release notifications
4. **Vulnerability Databases** — Follow Trivy/Grype updates

### Reporting Issues

- **Security vulnerabilities** → See [SECURITY.md](./SECURITY.md)
- **Bugs/Questions** → Open GitHub Issue
- **Feature requests** → GitHub Discussions or Issue
- **Contribution** → Pull requests welcome!

---

## Supply Chain Security

### Image Signing

Container images can be signed with Cosign for provenance verification:

```bash
# Verify our published images
cosign verify --key cosign.pub ghcr.io/gsa-tts/hedgedoc:v1.0.0

# Sign your builds
mise run sign:cosign-keygen
mise run sign:cosign-image <image-uri>
```

### SBOM Transparency

Every release includes:
- SPDX-formatted SBOM
- CycloneDX-formatted SBOM
- All dependencies with versions
- Available in release artifacts

### Federal Compliance

- NIST SP 800-218 controls for secure development
- Pinned dependencies (no floating versions)
- Automated security scanning
- Supply chain artifacts (SBOM)
- Vulnerability tracking and response

---

## Frequently Asked Questions

### Q: Which option should I choose?

**A:** For most users: Deploy from GHCR (registry option)
- Images are pre-scanned
- No local build required
- Smaller attack surface
- Use if: You trust our scanning and want simplicity

**Local build if:**
- You need to customize the Dockerfile
- You want to review code before building
- You want to push to your own registry
- You need to meet specific compliance requirements

### Q: What if I find a vulnerability?

**A:** See [SECURITY.md](./SECURITY.md) for coordinated disclosure process
- Email security@gsa.gov with "collab-containers vulnerability" in subject
- Expected response within 48 hours
- We'll work with you to fix it responsibly

### Q: Can I use this in production?

**A:** Yes, with caveats:
- Follow the production checklist in [DEPLOYMENT.md](./DEPLOYMENT.md)
- Review security scan reports
- Understand that some apps are labeled "experimental" (see README.md status table)
- Follow your organization's approval process

### Q: How often are security updates released?

**A:**
- Critical vulnerabilities: within 30 days
- High vulnerabilities: within 60 days
- Renovate PRs created automatically (weekly, configurable)
- Follow GitHub Releases or subscribe to notifications

### Q: Can I contribute?

**A:** Yes! We welcome:
- Bug reports and fixes
- New container apps
- Documentation improvements
- Security suggestions

See CONTRIBUTING.md (if exists) or open a Pull Request.

---

## Compliance & Standards

### Federal Standards Alignment

- ✅ **NIST SP 800-53** — Security controls for federal systems
- ✅ **NIST SP 800-218** — Secure software development framework
- ✅ **NIST AI RMF** — AI risk management (if applicable)
- ✅ **OWASP Top 10** — Web application security
- ✅ **CIS Benchmarks** — Container security hardening

### Cloud.gov

Optimized for cloud.gov deployment:
- Standard Cloud Foundry manifests
- FedRAMP-compatible environment
- Supports cloud.gov UAA/SAML
- Service binding support

### GSA-TTS Standards

Follows GSA-TTS conventions:
- Renovate configuration extends org config
- Secret scanning from org scanning service
- Dependency lint from org scanning service
- AGENTS.md compliance

---

## Getting Help

### Documentation

1. **Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **Security**: [SECURITY.md](./SECURITY.md)
3. **Release readiness**: [PUBLIC_READINESS_CHECKLIST.md](./PUBLIC_READINESS_CHECKLIST.md)
4. **Tools**: `mise run help:security` or `mise run help:deployment`
5. **GitHub**: Discussions tab or Issues

### Tools & Commands

```bash
# Security scanning
mise run scan:all
mise run scan:secrets
mise run scan:dockerfile

# Building
mise run container:build-all
mise run container:inspect <app>

# SBOM & Signing
mise run sbom:generate <app>
mise run sign:cosign-keygen

# Help
mise run help:security
mise run help:deployment

# Installation
curl https://mise.jdx.dev/install.sh | sh
```

### External Resources

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Cloud.gov Docs](https://cloud.gov/docs/)
- [NIST Standards](https://csrc.nist.gov/)
- [Cosign Signing](https://docs.sigstore.dev/cosign/installation/)

---

## Summary

**collab-containers** now has a public-release preparation framework with:

✅ Two deployment options (GHCR registry vs local build)
✅ Security scanning tools (Trivy, Gitleaks, Grype)
✅ Software Bill of Materials (SPDX + CycloneDX)
✅ Federal compliance references (NIST aligned)
✅ Automated CI/CD pipeline drafts (GitHub Actions)
✅ Container signing guidance for supply chain security (Cosign)
✅ Documentation for users, developers, and operators
✅ Public readiness checklist with sign-off tracking

Remaining blockers before publication: resolve required lint/container findings, verify release workflows in GitHub Actions, configure required GitHub repository settings, and complete the checklist sign-offs. Historical Gitleaks findings have documented, fingerprint-scoped acceptance in `GIT_HISTORY_REMEDIATION_PLAN.md`.

**Next Step:** Review [PUBLIC_READINESS_CHECKLIST.md](./PUBLIC_READINESS_CHECKLIST.md) before first public release.

---

**Last Updated:** 2026-09-11
**Version:** 1.0.0
**License:** CC0 1.0 Public Domain Dedication
