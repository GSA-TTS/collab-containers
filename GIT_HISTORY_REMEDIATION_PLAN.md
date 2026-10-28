---
title: "Git History Remediation Plan"
description: "Non-destructive plan for resolving redacted Gitleaks findings before public release"
status: draft
tier: 2
last_updated: "2026-10-28"
---

# Git History Remediation Plan

## Status

Current-file gates pass, including working-tree Gitleaks with `--no-git`. The historical findings listed below were reviewed and confirmed harmless on 2026-09-11, then accepted using targeted `.gitleaksignore` fingerprints.

Do not broaden the Gitleaks allowlist without a new review. If new history findings appear, treat them as release blockers until remediated or formally accepted through the security process.

## Current Redacted Inventory

Redacted scan dates: 2026-09-11 and 2026-10-05

The current history scan reports 13 findings. The initial nine use the `generic-api-key` rule; the four later-reviewed OpenObserve findings use the `curl-auth-user` rule. The table below intentionally includes only remediation metadata and omits secret values, matched text, authors, emails, and line contents.

| File | Start line | Rule ID | Commit prefix |
|------|------------|---------|---------------|
| `backstage/vars.yml` | 23 | `generic-api-key` | `cc704c1f5697` |
| `openobserve/oauth2-proxy-manifest.yml` | 10 | `generic-api-key` | `496219d5709b` |
| `backstage/manifest.yml` | 40 | `generic-api-key` | `cc704c1f5697` |
| `auth-benchmark/pomerium/vars.yml` | 8 | `generic-api-key` | `632eb1b4a00d` |
| `auth-benchmark/oauth2-proxy/vars.yml` | 5 | `generic-api-key` | `424464e05ef6` |
| `auth-benchmark/pomerium/vars.yml` | 7 | `generic-api-key` | `424464e05ef6` |
| `auth-benchmark/pomerium/vars.yml` | 8 | `generic-api-key` | `424464e05ef6` |
| `auth-benchmark/oauth2-proxy/manifest.yml` | 7 | `generic-api-key` | `424464e05ef6` |
| `auth-benchmark/LOGINGOV.md` | 121 | `generic-api-key` | `0d3840df603d` |
| `openobserve/bin/push-openobserve.sh` | 83 | `curl-auth-user` | `496219d5709b` |
| `openobserve/README.md` | 71 | `curl-auth-user` | `496219d5709b` |
| `openobserve/README.md` | 115 | `curl-auth-user` | `496219d5709b` |
| `openobserve/README.md` | 121 | `curl-auth-user` | `496219d5709b` |

> Repository owner confirmation (2026-10-05): The items above are user-provided generic provisioning examples. All instances created during active testing have been destroyed. These values are not sensitive or controlled.

> Repository owner confirmation (2026-10-22): Credentials in the previously tracked `vars.yml` files (`backstage`, `auth-benchmark/{fixture-app,oauth2-proxy,pomerium,zitadel}`) were rotated or never used. These files are now untracked and covered by `.gitignore`; sanitized `vars.example.yml` templates replace them. Their prior contents remain in Git history.

An authorized Cloud.gov inventory of the currently targeted `<org>/dev` space on 2026-10-05 found no OpenObserve application or related UAA service. This check did not query other spaces or organizations.

Initial triage should classify each row as real credential, generated secret, placeholder, or scanner false positive. Treat unknowns as potentially exposed credentials until a security owner decides otherwise.

Review outcome: the initial nine rows were confirmed harmless by the repository owner on 2026-09-11, and the four OpenObserve `curl-auth-user` examples were confirmed harmless on 2026-10-05. All are accepted with exact Gitleaks fingerprints in `.gitleaksignore`. This avoids rewriting repository history while keeping future unrelated findings visible.

## Decision (2026-10-28)

Under authority delegated by the repository owner, the agent chose **documented acceptance (option a), not a history rewrite**. This decision is recorded here and on issue #27 and still needs owner confirmation before the repository is made public.

Rationale:

- The owner confirmed on 2026-09-11, 2026-10-05 and 2026-10-22 that the findings are generic examples, were destroyed, or were rotated or never used.
- A full-history Gitleaks scan with the allowlist file disabled (`--gitleaks-ignore-path /dev/null`) reports no leaks on 2026-10-28, so the fingerprint acceptances cover only what the scanner already flags with the repo's own config.
- A rewrite is destructive: it changes every commit SHA, invalidates open PRs and forks, and requires a freeze window and force-push, none of which the agent should do unilaterally.
- Tracked `vars.yml` files for `backstage` and `auth-benchmark/*` remain in history (they were added at commits before 2026-10-22). The owner states their credentials were rotated or never used.

Residual risk: anyone who clones after publication keeps this history, and a rewrite later will not recall earlier clones. If the owner has any doubt about those `vars.yml` values, rotate them and use the dry-run procedure below before changing visibility.

## Guardrails

- Do not rewrite Git history without explicit owner approval.
- Do not publish, paste, or preserve secret values from scanner output.
- Rotate any value that may have been real before or immediately after history remediation.
- Coordinate force-push timing with all active contributors.
- Preserve a private backup before any destructive history rewrite.

## Tooling Status

Local check on 2026-09-11 found that `git-filter-repo` and BFG are not currently installed in the working environment. No install, history rewrite, or force-push was attempted.

Preferred next step is an approved installation of `git-filter-repo` in a clean environment, followed by the disposable-clone dry run below. Built-in `git filter-branch` is available but should remain a last-resort option because it is slower, easier to misuse, and deprecated for most modern history-cleanup workflows.

Explicit approval is still required before either of these actions:

- Installing history-rewrite tooling such as `git-filter-repo` or BFG.
- Rewriting and force-pushing repository history after the dry run succeeds.

## Disposable Dry-Run Result

Dry-run date: 2026-09-11

A disposable clone under `/tmp` was rewritten with Git's built-in `filter-branch` after extracting replacement values from a protected local Gitleaks JSON report. Raw scanner output and extracted values were stored only in a chmod-restricted temp directory, were never printed, and were deleted after the rewrite test.

| Check | Result |
|-------|--------|
| Pre-rewrite history findings | 9 |
| Unique values replaced | 5 |
| Rewrite command exit code | 0 |
| Commit count before rewrite | 53 |
| Commit count after rewrite | 53 |
| Post-rewrite full-history Gitleaks scan | Passed |
| Raw temp files deleted | Yes |

This result shows the current history findings can be removed in a disposable clone. It does not authorize rewriting or force-pushing the canonical repository.

## Recommended Path

### 1. Confirm Scope

Run a redacted history scan and record only metadata needed for remediation:

```bash
mise run scan:secrets
```

Capture only file paths, commit SHAs, rule IDs, and whether the value is believed to be real or placeholder/test data. Do not copy raw secret values into tickets, docs, chat, or commit messages.

### 2. Rotate Potentially Exposed Values

For every finding that may correspond to a real credential, rotate or revoke it before publishing the repository. Rotation should happen even if the history rewrite is planned, because the value has already existed in Git history.

### 3. Choose Remediation Method

Use one of these approaches:

| Option | Use When | Notes |
|--------|----------|-------|
| `git filter-repo` | Precise file/path/string cleanup is needed | Preferred modern replacement for `filter-branch` |
| BFG Repo-Cleaner | Findings are broad and pattern-based | Simpler for deleting known files or replacing known text |
| Formal risk acceptance | Findings are confirmed non-sensitive placeholders | Must be documented and approved before public release |

For this repository, start with `git filter-repo` unless the finding inventory shows a simpler BFG deletion/replacement path.

Recommended next decision: choose either a history rewrite using `git filter-repo` after credential rotation, or a documented risk acceptance for rows confirmed to be non-sensitive placeholders or false positives.

### 4. Dry Run on a Disposable Clone

Create a local disposable clone and test the rewrite there first:

```bash
git clone --mirror <private-repo-url> collab-containers-remediation.git
cd collab-containers-remediation.git
```

Apply the selected rewrite only in the disposable clone. Afterward, run:

```bash
gitleaks detect --source . --redact --verbose
```

The dry run is acceptable only when the redacted history scan passes or when any remaining findings have a documented approval decision.

### 5. Verify Functional State

After producing a remediated branch or mirror, check out a working copy and run:

```bash
mise install
mise run lint:all
mise run scan:dockerfile
mise exec -- gitleaks detect --source . --no-git --redact --verbose
mise run scan:trivy-fs
git diff --check
mise run scan:all
```

`mise run scan:all` should pass after successful history remediation.

### 6. Coordinate the Rewrite

Before pushing rewritten history:

- Announce a repository freeze window.
- Confirm no release tags or protected branches will be unexpectedly overwritten.
- Back up the original private repository state.
- Document contributor recovery steps, including reclone guidance.
- Confirm branch protection and CI settings are ready after the push.

### 7. Push and Re-Verify

Only after explicit approval, push the rewritten history and rerun the public-readiness gate suite in CI and locally.

## Acceptance Criteria

- Current-tree Gitleaks scan passes.
- Full-history Gitleaks scan passes, or each remaining finding has documented risk acceptance.
- Any potentially real exposed credentials are rotated or revoked.
- Lint, Dockerfile lint, Trivy filesystem scan, and whitespace checks pass.
- Release workflows complete successfully on the remediated history.
- Public readiness checklist is updated with verification evidence.

## Rollback Plan

If a rewrite causes unexpected loss or build failures:

1. Keep the repository private.
2. Stop further force-pushes.
3. Restore from the private backup or original remote refs.
4. Re-run the redacted scan and refine the remediation inventory.
