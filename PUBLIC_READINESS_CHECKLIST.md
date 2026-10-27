# Public Release Readiness Checklist

This checklist ensures the collab-containers repository meets security, compliance, and quality standards before public release.

**Current Status:** Current-file lint, Dockerfile lint, Trivy filesystem scan, and Gitleaks working-tree scan pass. Historical Gitleaks findings have documented, fingerprint-scoped acceptance. Public release remains blocked until release workflows, GitHub repository settings, and required sign-offs are verified.

**Release Version:** ___________
**Release Date:** ___________
**Reviewed By:** ___________

---

## 1. Security & Vulnerability Scanning

### Container Images

- [ ] All Dockerfiles pass Hadolint linting
  ```bash
  mise run scan:dockerfile
  ```

- [ ] All container images scanned with Trivy
  ```bash
  mise run container:build-all
  mise run scan:trivy-container <image-name>
  ```

- [ ] Every HIGH/CRITICAL Trivy finding is either fixed or recorded in
  `docs/IMAGE-VULNERABILITY-REGISTER.md` with an owner decision (findings are non-blocking by policy)
  ```bash
  # Verify: trivy-findings-*.txt and the job summary were reviewed against the register
  ```

  - [ ] Record unresolved findings in `docs/IMAGE-VULNERABILITY-REGISTER.md` (non-blocking by policy)

- [ ] SBOMs generated for all images
  - [ ] SPDX format: `sbom-*-spdx.json`
  - [ ] CycloneDX format: `sbom-*-cyclonedx.json`
  - [ ] Files checked into release artifacts

### Source Code

- [x] Historical Gitleaks findings have documented security acceptance
  ```bash
  mise run scan:secrets
  # Output: no unaccepted findings ✓
  ```
  - [x] Accepted fingerprints are listed in `.gitleaksignore`
  - [x] Acceptance rationale is recorded in `GIT_HISTORY_REMEDIATION_PLAN.md`

- [ ] No hardcoded credentials, API keys, or tokens
  ```bash
  grep -r "password\|secret\|token\|key" --include="*.js" --include="*.py" --include="*.sh" .
  # Should return no sensitive values
  ```

- [ ] `.gitignore` includes all sensitive files
  - [ ] `*.env` files (except `.env.example`)
  - [ ] `*.key`, `*.pem`, `*.p12`
  - [ ] `cosign.key` (private signing key)
  - [ ] Node: `node_modules/`, `package-lock.json`
  - [ ] Python: `__pycache__/`, `.venv/`, `*.egg-info/`

- [ ] Pre-commit hooks configured
  ```bash
  chmod +x .githooks/pre-commit
  git config core.hooksPath .githooks
  ```

### Dependencies

- [ ] No known high-risk vulnerabilities in dependencies
  ```bash
  mise run scan:grype .
  ```

- [ ] Dependencies use pinned (not floating) versions
  - [ ] `package.json`: No `^` or `~` in production deps
  - [ ] `Dockerfile`: Specific image tags (not `latest`)
  - [ ] `renovate.json`: Automatic updates configured

- [ ] All dependencies have approved licenses
  - [ ] No GPL, AGPL in production code (if restricted)
  - [ ] License declarations documented
  - [ ] `LICENSE` file present (CC0 1.0 confirmed)

---

## 2. Code Quality & Standards

### Code Structure

- [ ] Code is well-organized and documented
  - [ ] Each app directory has a `README.md`
  - [ ] Dockerfile includes inline comments for complex steps
  - [ ] Shell scripts include shebang and comments

- [ ] No dead code, unused imports, or commented code
  ```bash
  mise run lint:all
  ```

- [ ] YAML files pass validation
  ```bash
  mise run lint:yaml
  ```

- [ ] Shell scripts pass ShellCheck
  ```bash
  mise run lint:shell
  ```

### Documentation

- [ ] Main `README.md` is comprehensive and current
  - [ ] Deployment status table updated
  - [ ] All apps listed with auth recommendations
  - [ ] Steps to deploy are clear

- [ ] `DEPLOYMENT.md` covers both registry and local build options
  - [ ] Quick start section
  - [ ] Deployment options documented
  - [ ] Security scanning steps included
  - [ ] Production checklist provided

- [ ] `CONTRIBUTING.md` exists (if accepting contributions)
  - [ ] Development setup documented
  - [ ] Testing requirements clear
  - [ ] Pull request process defined

- [ ] Individual app READMEs documented
  - [ ] Environment variables listed
  - [ ] Dependencies explained
  - [ ] Known issues disclosed

- [ ] `mise.toml` includes task documentation
  - [ ] All tasks have clear descriptions
  - [ ] Help commands available
  - [ ] Usage examples provided

---

## 3. Container & Deployment

### Dockerfile Quality

- [ ] All Dockerfiles follow best practices
  - [ ] Use specific base image versions (not `latest`)
  - [ ] Minimal required packages installed
  - [ ] Cache layers optimized (frequently changed at end)
  - [ ] Multi-stage builds used where appropriate

- [ ] Security hardening applied
  - [ ] Run as non-root user
  - [ ] No unnecessary tools in base image
  - [ ] File permissions restricted
  - [ ] No setuid/setgid binaries

- [ ] Health checks configured (where applicable)
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
  ```

### Image Sizes

- [ ] Image sizes are optimized
  - [ ] Backstage: ___ MB (consider if <1GB)
  - [ ] HedgeDoc: ___ MB (consider if <500MB)
  - [ ] All others: ___ MB (consider if <300MB)

- [ ] `dive` analysis shows efficient layering
  ```bash
  mise run container:dive-analysis hedgedoc
  ```

### Registry Publishing

- [ ] GitHub Actions workflows are configured
  - [ ] `publish-containers.yml` runs on release
  - [ ] `container-scan-on-pr.yml` runs on PRs
  - [ ] Workflows have appropriate permissions
  - [ ] Token/secret permissions correctly scoped

- [ ] Container images push to GHCR
  - [ ] `ghcr.io/gsa-tts/<app>:latest` exists
  - [ ] `ghcr.io/gsa-tts/<app>:v<version>` exists
  - [ ] Version tags follow semantic versioning

- [ ] Release artifacts are attached
  - [ ] Trivy SARIF report attached
  - [ ] SBOM files (SPDX, CycloneDX) attached

---

## 4. GitHub Repository Settings

### Visibility & Access

- [ ] Repository visibility explicitly approved by the repository owner
  - [ ] Keep the repository private until all release gates and sign-offs pass
  - [ ] If public release is approved: Settings → General → "Repository visibility" = Public
  - [ ] Confirm the repository is discoverable only after the approval is recorded

- [ ] License is properly configured
  - [ ] CC0 1.0 Public Domain Dedication (confirmed in this repo)
  - [ ] `LICENSE` file exists at repo root
  - [ ] GitHub license selector recognizes it

### Permissions & Security

- [ ] Branch protection rules configured
  - [ ] `main` branch requires pull request reviews
  - [ ] Require status checks to pass before merge
  - [ ] Dismiss stale pull request approvals on push
  - [ ] Restrict who can push to matching branches

- [ ] Signing requirements (optional but recommended)
  - [ ] Require signed commits (if applicable)
  - [ ] Or: Document signing recommendations in CONTRIBUTING.md

- [ ] Secrets management configured
  - [ ] No repository secrets exposed in workflows
  - [ ] Credentials passed via GitHub Actions secrets only
  - [ ] SBX credentials used for USAi API (not in repo)

### Issue & Pull Request Management

- [ ] Issue templates created
- [x] `ISSUE_TEMPLATE/bug_report.md`
- [x] `ISSUE_TEMPLATE/feature_request.md`

- [ ] Pull request template created
- [x] `.github/pull_request_template.md` exists
- [x] Includes security checklist

- [ ] Contributor guidelines clear
  - [ ] `CONTRIBUTING.md` exists or in README
  - [ ] Code of conduct documented (if applicable)
  - [ ] Reporting security vulnerabilities explained (see below)

### Scanning & Automation

- [ ] Dependabot/Renovate configured
  - [ ] `renovate.json` present and extends GSA-TTS config
  - [ ] Automated dependency updates enabled
  - [ ] Security update PRs created automatically

- [ ] Secret scanning enabled and required by branch protection
  - [ ] `.github/workflows/secret-scan.yml` present
  - [ ] Gitleaks pre-commit hook configured
  - [ ] Prevent secrets from being committed

- [ ] Code scanning enabled and required by branch protection
  - [ ] `.github/workflows/dependency-lint.yml` configured
  - [ ] Trivy scanning in container workflows
  - [ ] SARIF reports uploaded to GitHub Security tab

### Settings Best Practices

- [ ] Discussions enabled (if accepting community input)
  - [ ] Settings → General → "Discussions" = On
  - [ ] Categories configured (Q&A, Ideas, etc.)

- [ ] GitHub Pages configured (optional, for docs)
  - [ ] Settings → Pages → Source set to `main` or `docs/`
  - [ ] README or docs published at `https://gsa-tts.github.io/collab-containers/`

---

## 5. Compliance & Federal Standards

### NIST & Security Standards

- [ ] Security scanning in place (aligns with NIST SP 800-53)
  - [ ] Vulnerability scanning: Trivy ✓
  - [ ] Configuration scanning: Trivy (misconfig) and Hadolint ✓
  - [ ] Secret scanning: Gitleaks ✓
  - [ ] Dependency scanning: Grype ✓

- [ ] Supply chain security controls (NIST SP 800-218)
  - [ ] SBOM generated (SPDX/CycloneDX)
  - [ ] Dependencies pinned and scanned
  - [ ] Build process documented

- [ ] Least privilege applied
  - [ ] Containers run as non-root
  - [ ] No unnecessary tools in images
  - [ ] GitHub Actions permissions scoped

### Documentation Requirements

- [ ] Security policy documented
  - [ ] `SECURITY.md` exists
  - [ ] Vulnerability disclosure process clear
  - [ ] Contact information provided

- [ ] Support & maintenance expectations clear
  - [ ] README clarifies ephemeral/prototype nature
  - [ ] Cloud.gov as primary deployment platform
  - [ ] Maintenance timeline documented
  - [ ] Security patching process explained

- [ ] Compliance notes documented
  - [ ] FIPS 140 considerations (if applicable)
  - [ ] FedRAMP requirements (if applicable)
  - [ ] ATO status (if applicable)

---

## 6. Metadata & Configuration

### Repository Files

- [ ] `.gitignore` is comprehensive
  - [ ] Covers all build artifacts
  - [ ] Covers all secrets/credentials
  - [ ] No sensitive files ever committed

- [ ] `.gitattributes` configured (optional)
  - [ ] CRLF handling set for cross-platform
  - [ ] Large file handling (if needed)

- [ ] `.github` directory structure and administrator configuration reviewed
  ```
  .github/
  ├── CODEOWNERS                  # Activate with actual maintainer identities
  ├── workflows/
  │   ├── publish-containers.yml
  │   ├── container-scan-on-pr.yml
  │   ├── secret-scan.yml
  │   └── dependency-lint.yml
  ├── pull_request_template.md
  └── ISSUE_TEMPLATE/
  ```

- [ ] `mise.toml` includes comprehensive tooling
  - [ ] Security scanning tasks
  - [ ] CI/CD pre-checks
  - [ ] Help documentation

- [ ] `trivy.yaml` configured for scanning
  - [ ] Severity levels set
  - [ ] Registries configured
  - [ ] Exceptions defined

- [ ] `.gitleaks.toml` configured for secret detection
  - [ ] Federal API keys covered (USAi, cloud.gov)
  - [ ] Common patterns detected
  - [ ] Appropriate allowlists configured

### Release Configuration

- [ ] `renovate.json` properly configured
  - [ ] Extends `local>GSA-TTS/scanning-service:default.json5`
  - [ ] Auto-merge safe updates
  - [ ] Schedule configured (not too aggressive)

- [x] Release tagging convention documented
  - [x] Shared repository release tag: `v<semver>` (e.g., `v1.0.0`)
  - [x] Per-container GitHub Release tag: `<app>-v<semver>`
  - [x] Documented in CONTRIBUTING.md

---

## 7. Testing & Quality Assurance

### Manual Testing

- [ ] All applications tested and working
  - [ ] [ ] Marimo: ✅ Confirmed working
  - [ ] [ ] openvscode-server: ✅ Confirmed working
  - [ ] [ ] Excalidraw: ✅ Confirmed working
  - [ ] [ ] HedgeDoc: ✅ Confirmed working
  - [ ] [ ] Backstage: ✅ Confirmed working
  - [ ] [ ] CryptPad: ✅ Confirmed working
  - [ ] [ ] Outline: ❌ Known issues documented
  - [ ] [ ] Planka: ❌ Known issues documented

- [ ] Auth proxy integration tested
  - [ ] oauth2-proxy integration verified
  - [ ] Known issues documented in README
  - [ ] Workarounds provided (if any)

### Automated Testing

- [ ] GitHub Actions workflows pass
  - [ ] Secret scan succeeds
  - [ ] Dependency lint succeeds
  - [ ] Container scan succeeds
  - [ ] Build succeeds

- [ ] Pull request checks pass
  - [ ] All required status checks enabled
  - [ ] No green checkmarks skipped

- [ ] Release artifacts verified
  - [ ] Images push to GHCR successfully
  - [ ] Scan reports generated and attached
  - [ ] Release notes created

---

## 8. Documentation for End Users

### README Quality

- [ ] Clear title and description
- [ ] Table showing deployment status for each app
- [ ] Prerequisites listed
- [ ] Step-by-step deployment instructions
- [ ] Troubleshooting section
- [ ] Links to individual app READMEs
- [ ] Link to DEPLOYMENT.md for advanced options
- [ ] License clearly stated

### Deployment Documentation

- [ ] DEPLOYMENT.md covers both options
  - [ ] Deploy from GHCR (recommended)
  - [ ] Build locally from Dockerfile
  - [ ] Security scanning steps
  - [ ] Production checklist

- [ ] Examples provided for each deployment method
  - [ ] Docker CLI
  - [ ] Kubernetes
  - [ ] Docker Compose
  - [ ] Cloud.gov CF CLI

### Security Documentation

- [ ] SECURITY.md exists with:
  - [ ] Vulnerability disclosure instructions
  - [ ] Security contacts/email
  - [ ] Response timeline expectations
  - [ ] PGP key (if applicable)

- [ ] Security scanning explained
  - [ ] What Trivy scans for
  - [ ] How to interpret results
  - [ ] How to address findings

---

## 9. Federal Readiness (GSA-TTS Projects)

### Repository Standards

- [ ] Repository follows GSA-TTS conventions
  - [ ] Org: `github.com/GSA-TTS/`
  - [ ] Topic tags added: `collaboration`, `containers`, `federal`
  - [ ] Description includes "GSA" or "Federal"

- [ ] AGENTS.md configured (if using AI assistance)
  - [ ] Behavioral rules documented
  - [ ] Security constraints specified
  - [ ] Approval workflows defined

- [ ] Scanning service integrated
  - [ ] Renovate config extends GSA-TTS default
  - [ ] Secret scan uses org config
  - [ ] Dependency lint uses org rules

### Interoperability

- [ ] Cloud.gov compatibility verified
  - [ ] `manifest.yml` uses valid syntax
  - [ ] Image pulls successfully on cloud.gov
  - [ ] Environment variables documented
  - [ ] Service bindings work (if needed)

- [ ] Standards compliance documented
  - [ ] NIST controls cited
  - [ ] CIS Benchmarks referenced (if applicable)
  - [ ] Federal acquisition clauses noted (if applicable)

---

## 10. Final Sign-Off

### Pre-Release Review Checklist

- [ ] Security scan artifacts reviewed
- [ ] SBOM reviewed for unknown/risky dependencies
- [ ] Deployment instructions verified (both options work)
- [ ] Documentation complete and accurate
- [ ] GitHub repository settings locked down
- [ ] Release notes drafted and clear
- [ ] No blocking issues open
- [ ] All branch protection checks pass

### Approval Sign-Off

**Technical Review:**
- Reviewer: ________________________  Date: ___________
- Sign-off: ✅ Approved / ❌ Needs Changes / ⚠️ Approved with notes

**Security Review:**
- Reviewer: ________________________  Date: ___________
- Sign-off: ✅ Approved / ❌ Needs Changes / ⚠️ Approved with notes

**Compliance Review:**
- Reviewer: ________________________  Date: ___________
- Sign-off: ✅ Approved / ❌ Needs Changes / ⚠️ Approved with notes

### Release Steps

1. [ ] Create GitHub Release with tag: `<app>-v<semver>`
2. [ ] Release notes include:
   - [ ] Breaking changes (if any)
   - [ ] New features
   - [ ] Security patches
   - [ ] Known issues
3. [ ] Verify SBOM and scan reports attached
4. [ ] Verify images in GHCR accessible
5. [ ] Announce release in appropriate channels
6. [ ] Monitor for issues in first 24 hours

---

## Notes & Issues Found

(Document any issues found during review and their resolution)

```
Issue 1:
  Status: [ ] Resolved [ ] Deferred [ ] Blocked
  Resolution:

Issue 2:
  Status: [ ] Resolved [ ] Deferred [ ] Blocked
  Resolution:

Issue 3:
  Status: [ ] Resolved [ ] Deferred [ ] Blocked
  Resolution:
```

---

## References

- [NIST SP 800-53 Rev 5 Security Controls](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5)
- [NIST SP 800-218 Secure Software Development Framework](https://csrc.nist.gov/publications/detail/sp/800-218/final)
- [GSA-TTS Agentic Coding Playbook](https://github.com/GSA-TTS/agentic-coding-playbook)
- [Cloud.gov Documentation](https://cloud.gov/docs/)
- [Container Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Container_Security_Cheat_Sheet.html)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
