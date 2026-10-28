# Public Release Readiness Checklist

This checklist ensures the collab-containers repository meets security, compliance, and quality standards before public release.

**Current Status (updated 2026-10-28): NOT READY for public release, pending human actions.** Repository content, scans, the `main` ruleset, and a first publish run (`0.1.0-rc1`, pre-release) are done and verified. What remains cannot be done by an agent: independent review and approval, the three sign-offs, Allstar administrator assignment, and Backstage runtime verification. Only items verified on 2026-10-28 are ticked; everything else is unverified, not failed.

### Open blockers

| # | Blocker | Needed from | Tracking |
|---|---|---|---|
| 1 | Allstar reports no repository administrator or team. Two individuals have admin, but no team does | Org admin: assign an admin team (Settings -> Manage Access) | Allstar #3 |
| 2 | Pull requests now need 1 approving review and the repo has no bypass actors, so PR #29 and every later PR needs a second maintainer | Add at least one more maintainer/reviewer | #25 |
| 3 | Vulnerability register rows need human review (hedgedoc 87 Node findings incl. 10 CRITICAL; backstage 43 OS + 34 Node incl. 2 CRITICAL) | Security reviewer | #26 |
| 4 | Backstage image has never been run against a database (native modules `better-sqlite3`, `keytar` unverified at runtime) | Anyone with Docker on an amd64 host or a cloud.gov dev space | #28 |
| 5 | Git history: acceptance recorded by the agent under owner delegation; needs owner confirmation | Repository owner | #27 |
| 6 | Sign-offs, final release version and date | Technical, Security, Compliance reviewers | this file |
| 7 | Visibility change to public | Repository owner, after 1-6 | this file |

Done 2026-10-28: `main` ruleset enforced (1 approval, stale reviews dismissed, thread resolution, Secret Scan and Dependency Lint required, no deletion or force-push); secret scanning push protection and Code Security enabled; default workflow token read-only and Actions cannot approve PRs; description and topics set; `LICENSE` replaced with the standard CC0 1.0 legal text; `CODEOWNERS` set to the maintainer (code-owner review deliberately not required); `publish-containers.yml` run 40690698429 succeeded for hedgedoc and backstage (see below); all `:latest` manifest references pinned.

Container Scan is not a required check because it only runs when Dockerfiles or scan config change, so requiring it would block every other PR.

**Release Version:** ___________ (`0.1.0-rc1` published as a pre-release on 2026-10-28 for verification only)
**Release Date:** ___________
**Reviewed By:** ___________

---

## 1. Security & Vulnerability Scanning

### Container Images

- [ ] All Dockerfiles pass Hadolint linting
  ```bash
  mise run scan:dockerfile
  ```

- [x] All container images scanned with Trivy (publish run 40690698429)
  ```bash
  mise run container:build-all
  mise run scan:trivy-container <image-name>
  ```

- [x] Every HIGH/CRITICAL Trivy finding is either fixed or recorded in
  `docs/IMAGE-VULNERABILITY-REGISTER.md` with an owner decision (findings are non-blocking by policy)
  ```bash
  # Verify: trivy-findings-*.txt and the job summary were reviewed against the register
  ```

  - [x] Record unresolved findings in `docs/IMAGE-VULNERABILITY-REGISTER.md` (non-blocking by policy; human review still open)

- [x] SBOMs generated for all images
  - [x] SPDX format: `sbom-*-spdx.json`
  - [x] CycloneDX format: `sbom-*-cyclonedx.json`
  - [x] Files attached to the `hedgedoc-v0.1.0-rc1` and `backstage-v0.1.0-rc1` releases

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

- [x] Container images push to GHCR (publish job logs show digests pushed for `v0.1.0-rc1` and `latest`; a pull attempt with the local token was denied, likely missing `read:packages` scope, so image pullability is unverified)
  - [x] `ghcr.io/gsa-tts/<app>:latest` exists (hedgedoc, backstage)
  - [x] `ghcr.io/gsa-tts/<app>:v<version>` exists (`v0.1.0-rc1`)
  - [ ] Version tags follow semantic versioning (`v0.1.0-rc1` is semver; final version not chosen)

- [x] Release artifacts are attached
  - [x] Trivy SARIF report attached
  - [x] SBOM files (SPDX, CycloneDX) attached

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
  - [x] GitHub license selector recognizes it (standard CC0 text committed; confirm on GitHub after merge)

### Permissions & Security

- [x] Branch protection rules configured (ruleset `main`, active)
  - [x] `main` branch requires pull request reviews (1)
  - [x] Require status checks to pass before merge (Secret Scan, Dependency Lint)
  - [x] Dismiss stale pull request approvals on push
  - [x] Restrict who can push to matching branches (PR required; no bypass actors)

- [ ] Signing requirements (optional but recommended)
  - [ ] Require signed commits (if applicable)
  - [ ] Or: Document signing recommendations in CONTRIBUTING.md (not done; optional)

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
  - [x] Required by branch protection
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
  - [x] Secret scan succeeds
  - [x] Dependency lint succeeds
  - [x] Container scan succeeds (last on PR #24)
  - [x] Build succeeds (publish run 40690698429)

- [ ] Pull request checks pass
  - [ ] All required status checks enabled
  - [ ] No green checkmarks skipped

- [ ] Release artifacts verified
  - [x] Images push to GHCR successfully
  - [x] Scan reports generated and attached
  - [x] Release notes created (auto-generated; the draft text promises "Gitleaks" and "CodeQL" which the job does not run)

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
