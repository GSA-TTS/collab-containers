---
title: "Contributing"
description: "Contribution, review, and release-tagging requirements for collab-containers"
status: canonical
tier: 2
last_updated: "2026-10-05"
---

# Contributing

Thank you for improving collab-containers. This repository remains private until its release owner explicitly approves public visibility.

## Before Opening a Pull Request

1. Read [SECURITY.md](./SECURITY.md). Do not report security vulnerabilities in public issues or pull requests.
2. Keep secrets, credentials, and production data out of the repository.
3. Run the relevant local checks:

```bash
mise run ci:pre-release-check
```

4. Describe the change, testing, and security impact in the pull request template.

## Review Requirements

- At least one authorized maintainer must approve the pull request.
- Required GitHub checks must pass.
- New or changed container images must have their Trivy findings reviewed and recorded in `docs/IMAGE-VULNERABILITY-REGISTER.md`.
- Contributors must update relevant deployment or security documentation with code changes.

## Release Tags

Create one shared repository release tag using `v<semver>`, for example `v1.0.0`. The publishing workflow creates per-container GitHub Releases using `<app>-v<semver>` and pushes images tagged `v<semver>` and `latest`.

## Local Git Hooks

Enable the checked-in secret-scanning hook before contributing:

```bash
git config core.hooksPath .githooks
```

The hook requires Gitleaks to be installed and scans staged content before each commit.
