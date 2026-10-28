# Public Release Readiness Checklist

This checklist ensures the collab-containers repository meets security, compliance, and quality standards before public release.

**Current Status (reassessed 2026-10-28): NOT READY for public release.** Repository content, local scans and CI on pull requests are in good shape. The remaining blockers are owner actions on GitHub (ruleset enforcement, administrators, CODEOWNERS), the history-acceptance decision, a first successful run of the publish workflow, human review of the vulnerability register, and the three sign-offs. See "Open blockers" below. Only items verified on 2026-10-28 are ticked; everything else is unverified, not failed.

### Open blockers

| # | Blocker | Owner action | Tracking |
|---|---|---|---|
| 1 | `main` ruleset is in `evaluate` mode, requires 0 approvals, and has no required status checks | Enforce the ruleset, require >=1 review and the Container Scan, Secret Scan and Dependency Lint checks, dismiss stale reviews | #25, Allstar #1 |
| 2 | No repository administrator or team recognised by Allstar | Assign an admin team in Settings -> Manage Access | Allstar #3 |
| 3 | `.github/CODEOWNERS` has no real owners | Add maintainer identities, then consider code-owner review | #25 |
| 4 | Git history decision (accept vs rewrite) | Owner decision | #27 |
| 5 | `publish-containers.yml` has never run | Run it (manual dispatch) and verify GHCR tags, SBOMs, SARIF, release notes | #26 |
| 6 | Vulnerability register rows need human review; Backstage runtime unverified | Review `docs/IMAGE-VULNERABILITY-REGISTER.md`; start Backstage against a database | #26, #28 |
| 7 | Sign-offs and release version/date blank | Technical, Security, Compliance reviewers | this file |
| 8 | GitHub does not recognise `LICENSE` (license shows as "Other") | Replace with the standard CC0 1.0 legal text if license detection matters | new |

Settings applied 2026-10-28: secret scanning push protection enabled; Code Security enabled; default workflow token set to read-only and Actions can no longer approve pull requests; repository description and topics added.

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

- [ ] `.gitignore` includes all sensitive files (Node and Python entries not present)
  - [x] `*.env` files (except `.env.example`)
  - [x] `*.key`, `*.pem`, `*.p12`
  - [x] `cosign.key` (private signing key)
  - [ ] Node: `node_modules/`, `package-lock.json`
  - [ ] Python: `__pycache__/`, `.venv/`, `*.egg-info/`

- [x] Pre-commit hooks configured
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
  - [x] `Dockerfile`: Specific image tags (not `latest`)
  - [ ] `renovate.json`: Automatic updates configured

- [ ] All dependencies have approved licenses
  - [ ] No GPL, AGPL in production code (if restricted)
  - [ ] License declarations documented
  - [x] `LICENSE` file present (CC0 1.0 confirmed)

---

## 2. Code Quality & Standards

### Code Structure

- [ ] Code is well-organized and documented
  - [x] Each app directory has a `README.md`
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

- [x] `CONTRIBUTING.md` exists (if accepting contributions)
  - [x] Development setup documented
  - [x] Testing requirements clear
  - [x] Pull request process defined

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
  - [x] Use specific base image versions (not `latest`)
  - [ ] Minimal required packages installed
  - [ ] Cache layers optimized (frequently changed at end)
  - [ ] Multi-stage builds used where appropriate

- [ ] Security hardening applied
  - [x] Run as non-root user
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
  - [x] `publish-containers.yml` runs on release (configured; **never executed**)
  - [x] `container-scan-on-pr.yml` runs on PRs
  - [x] Workflows have appropriate permissions (SHA-pinned actions, scoped permissions)
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
  - [x] `LICENSE` file exists at repo root
  - [ ] GitHub license selector recognizes it (currently shows "Other")

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

- [x] Issue templates created
- [x] `ISSUE_TEMPLATE/bug_report.md`
- [x] `ISSUE_TEMPLATE/feature_request.md`

- [x] Pull request template created
- [x] `.github/pull_request_template.md` exists
- [x] Includes security checklist

- [ ] Contributor guidelines clear
  - [x] `CONTRIBUTING.md` exists or in README
  - [ ] Code of conduct documented (if applicable)
  - [x] Reporting security vulnerabilities explained (see below)

### Scanning & Automation

- [ ] Dependabot/Renovate configured
  - [x] `renovate.json` present and extends GSA-TTS config
  - [ ] Automated dependency updates enabled
  - [ ] Security update PRs created automatically

- [ ] Secret scanning enabled and required by branch protection
  - [x] `.github/workflows/secret-scan.yml` present
  - [x] Gitleaks pre-commit hook configured
  - [x] Push protection enabled (2026-10-28)
  - [ ] Required by branch protection (ruleset not enforced)
  - [ ] Prevent secrets from being committed

- [ ] Code scanning enabled and required by branch protection
  - [x] `.github/workflows/dependency-lint.yml` configured
  - [x] Trivy scanning in container workflows
  - [x] Code Security enabled (2026-10-28)
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
  - [x] `SECURITY.md` exists
  - [x] Vulnerability disclosure process clear
  - [x] Contact information provided

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
  - [x] Topic tags added: `collaboration`, `containers`, `federal`
  - [x] Description includes "GSA" or "Federal"

- [x] AGENTS.md configured (if using AI assistance)
  - [x] Behavioral rules documented
  - [x] Security constraints specified
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
