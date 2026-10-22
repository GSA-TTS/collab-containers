# Security Policy

This document outlines the security practices and vulnerability reporting process for the collab-containers repository.

## Reporting Security Vulnerabilities

### Who Should Report?

If you discover a security vulnerability in collab-containers or any of its container images, please report it responsibly. Do not open a public GitHub issue for security vulnerabilities.

### How to Report

1. **Email:** Send a detailed report to [security@gsa.gov](mailto:security@gsa.gov)
   - Include: "collab-containers security vulnerability" in the subject
   - Reference: https://github.com/GSA-TTS/collab-containers

2. **Include in your report:**
   - Description of the vulnerability
   - Container/component affected
   - Steps to reproduce (if applicable)
   - Potential impact
   - Suggested fix (if you have one)
   - Your contact information (name, email, phone if you prefer)

### Expected Response Timeline

- **Initial Response:** 48 business hours
- **Status Update:** Every 5 business days
- **Target Fix:** 30 days for CRITICAL vulnerabilities
- **Target Fix:** 60 days for HIGH vulnerabilities
- **Target Fix:** 90 days for MEDIUM vulnerabilities
- **Target Fix:** 120 days for LOW vulnerabilities

Timelines may extend based on severity assessment and the complexity of the fix.

### Disclosure Policy

We follow **coordinated disclosure** principles:

1. **Do not publicly disclose** the vulnerability until we've had time to develop and test a fix
2. We will **credit you** in the security advisory (if desired)
3. We will **publish** a GitHub Security Advisory when the fix is available
4. We will **tag** a release with the fix and document the vulnerability

---

## Security Scanning

### Automated Scans

Every container image is automatically scanned:

- **Trivy** — Vulnerability, configuration, and secret scanning
- **Gitleaks** — Secret detection in git history
- **Grype** — Dependency vulnerability analysis

Scans run:
- On every pull request (container-scan-on-pr.yml)
- On every release (publish-containers.yml)
- Via GitHub branch protection checks

### View Scan Results

#### Published Releases (GitHub)

1. Navigate to [Releases](https://github.com/GSA-TTS/collab-containers/releases)
2. Click on a per-container release tag (e.g., `hedgedoc-v1.0.0`)
3. Download attached reports:
   - `trivy-vulnerability-scan.sarif` — Trivy results
   - `sbom-spdx.json` — SPDX Software Bill of Materials
   - `sbom-cyclonedx.json` — CycloneDX SBOM

#### GitHub Security Tab

1. Go to [Security tab](https://github.com/GSA-TTS/collab-containers/security)
2. View "Code scanning" results
3. SARIF reports from Trivy are uploaded here automatically

#### Local Scanning

```bash
# Install mise (tool runner)
curl https://mise.jdx.dev/install.sh | sh

# Run all security scans
mise run scan:all

# Or specific scans
mise run scan:secrets         # Gitleaks
mise run scan:dockerfile      # Hadolint
mise run scan:trivy-fs        # Trivy filesystem
mise run scan:grype .         # Grype dependencies
```

---

## Container Security Practices

### Image Hardening

Production images should be hardened using:

- Specific base image versions (not `latest`)
- Minimal required packages
- Non-root user execution
- Read-only filesystems where applicable
- No shell/debug tools in production images where avoidable
- Security updates applied during rebuilds
- Secrets supplied through runtime configuration or service bindings

Current image hardening status is tracked by Trivy and Hadolint results, and by `docs/IMAGE-VULNERABILITY-REGISTER.md`. Do not treat an image as production-hardened until those findings are reviewed and resolved or formally accepted.

### Dependency Management

- ✅ Dependencies pinned to specific versions
- ✅ Automated updates via Renovate
- ✅ Security updates prioritized
- ✅ Vulnerabilities scanned continuously
- ✅ License compliance verified

### Secret Management

- ✅ Gitleaks detects secrets in git history
- ✅ Pre-commit hooks prevent secret commits
- ✅ Environment variables for sensitive data
- ✅ No credentials in Dockerfiles
- ✅ Cloud.gov service bindings for data access

---

## Supply Chain Security

### Signed Releases

Container images can be signed using Cosign for provenance verification:

```bash
# Verify image signature
cosign verify --key cosign.pub ghcr.io/gsa-tts/hedgedoc:v1.0.0
```

### Software Bill of Materials (SBOM)

Every release includes:

- **SPDX JSON** — Industry standard format
- **CycloneDX JSON** — OWASP standard format

SBOM includes all dependencies and their versions for transparency.

### Build Integrity

- GitHub Actions workflows are reproducible
- Build context and parameters logged
- Release artifacts tied to specific commits
- Tags and signatures verified before deployment

---

## Code Review & Quality

### Pull Request Requirements

All changes require:

- ✅ At least one code review approval
- ✅ All status checks passing
- ✅ No conflicts with base branch
- ✅ Security scan artifacts reviewed
- ✅ Security policy acknowledged (AGENTS.md compliance)

### Automated Checks

Every pull request runs:

1. **Container Scan** — Trivy
2. **Secret Scan** — Gitleaks
3. **Dependency Lint** — Renovate advisory
4. **Dockerfile Lint** — Hadolint
5. **YAML Validation** — YAMLLint
6. **Shell Script Check** — ShellCheck

Must pass: ✅ All checks must be green before merge

### Branch Protection

`main` branch is protected with:

- ✅ Require pull request reviews (minimum 1)
- ✅ Require status checks to pass
- ✅ Dismiss stale PR approvals on push
- ✅ Restrict who can push to matching branches

---

## Compliance & Standards

### Federal Standards

This project aligns with:

- **NIST SP 800-53** — Security controls for federal systems
- **NIST SP 800-218** — Secure software development framework
- **NIST AI RMF** — AI risk management (if applicable)
- **OWASP Top 10** — Web application security
- **CIS Benchmarks** — Container security benchmarks

### Cloud.gov Compliance

Designed for deployment on cloud.gov:

- ✅ Uses Cloud Foundry standard manifests
- ✅ Compatible with cloud.gov FedRAMP environment
- ✅ Supports cloud.gov UAA/SAML authentication
- ✅ Configured for cloud.gov service bindings

### Accessibility & Compliance

- ✅ Each app's original security model preserved
- ✅ No additional vulnerabilities introduced by deployment configs
- ✅ Authentication proxies recommended for public access
- ✅ Documentation includes compliance notes

---

## Known Issues & Limitations

### Known Vulnerabilities

No public advisories are currently published. See GitHub Security tab and release artifacts for active scan findings.

### Public Release Gates

- Historical Gitleaks findings have documented, fingerprint-scoped acceptance in `GIT_HISTORY_REMEDIATION_PLAN.md`; any new unaccepted finding blocks release.
- Current-file secret scans must pass before every release.
- Container and YAML lint findings must be resolved or explicitly documented as accepted risk before public release.
- Release workflows, GitHub branch protection, code scanning configuration, and required sign-offs must be verified before public release.

### Known Limitations

1. **Outline** — Cloud.gov WAF blocks `/api/auth.config` endpoint (known issue)
2. **Planka** — SAML cookie handling issues with cloud.gov (known issue)
3. **Auth proxy required** — Some apps require oauth2-proxy in front for security

See [README.md](./README.md) deployment status table for per-app notes.

---

## Responsible Disclosure Timeline Example

**July 1, 2024:** Vulnerability reported → We acknowledge receipt
**July 2, 2024:** We assess severity (HIGH) and begin investigation
**July 15, 2024:** We develop and test a fix
**July 20, 2024:** We push fix to main, tag release v1.1.0
**July 20, 2024:** We publish GitHub Security Advisory
**July 22, 2024:** We announce on mailing list, credit reporter

---

## Version History

| Date | Version | Notes |
|------|---------|-------|
| 2026-09-11 | 1.0 | Initial security policy |

## Questions?

For questions about this policy, open a discussion in the [GitHub Discussions](https://github.com/GSA-TTS/collab-containers/discussions) tab.

For security concerns, email [security@gsa.gov](mailto:security@gsa.gov).
