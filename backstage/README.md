# Backstage on cloud.gov with SSO Configuration

[Backstage](https://backstage.io/) is an open-source framework for building developer portals, originally created by Spotify. This folder contains deployment configurations and guidance for running Backstage on cloud.gov with Single Sign-On (SSO).

---

## Deployment Strategy Recommendation

> **TL;DR:** Fork the Backstage repo and deploy using the Node.js buildpack. Docker-based deployment is not recommended for Backstage on cloud.gov.

### Why Buildpack over Docker?

Backstage is a complex Node.js monorepo with:
- Native dependencies requiring compilation (better-sqlite3, isolated-vm, etc.)
- A multi-package workspace structure
- Separate frontend and backend builds that must be bundled together

**Docker challenges encountered:**
- Multi-stage builds are slow and error-prone
- Native module compilation issues across architectures (arm64 → amd64)
- The official `ghcr.io/backstage/backstage` image is **backend-only** (no frontend)
- Custom Docker builds require maintaining a registry

**Buildpack advantages:**
- Native dependency compilation handled automatically
- Simpler CI/CD (`yarn build && cf push`)
- Easier debugging (no Docker layer abstraction)
- Full control over plugins, themes, and configuration

### Recommended Approach

1. **Create a Backstage app** (or fork an existing one):
   ```bash
   npx @backstage/create-app@latest
   cd backstage-app
   ```

2. **Build locally**:
   ```bash
   yarn install
   yarn tsc
   yarn build:backend --config ../../app-config.yaml --config ../../app-config.production.yaml
   ```

3. **Deploy with buildpack** using a manifest like:
   ```yaml
   applications:
     - name: backstage-staging
       memory: 1G
       disk_quota: 2G
       buildpacks:
         - nodejs_buildpack
       path: .
       command: node packages/backend/dist/index.js --config app-config.yaml --config app-config.production.yaml
       routes:
         - route: backstage-staging.apps.internal
       services:
         - backstage-db
       env:
         NODE_ENV: production
   ```

4. **Pair with oauth2-proxy** for authentication (see Scenario A below).

### Current Status

The files in this directory (`Dockerfile`, `manifest.yml`, `init.sh`) represent an **experimental Docker-based approach** that is not recommended for production. They are retained for reference.

| File | Purpose | Status |
|------|---------|--------|
| `Dockerfile` | Multi-stage Docker build | Experimental |
| `manifest.yml` | Docker image deployment + oauth2-proxy | Experimental |
| `init.sh` | Runtime credential injection | Reference only |
| `app-config.production.yaml` | cloud.gov database/auth config | **Use this** |
| `vars.yml` | Deployment variables | **Use this** |

---

## 1. Supported Authentication Architectures

To align with the **collab-containers** auth patterns, this Backstage template is fully compatible with both major cloud.gov identity architectures:

```mermaid
graph TD
    subgraph Scenario A: Auth Proxy (oauth2-proxy)
        UserA([User]) -->|HTTPS| Proxy[oauth2-proxy]
        Proxy -->|1. Authenticates against Login.gov / UAA| IdP[Identity Provider]
        Proxy -->|2. Injects User Headers| BackstageA[Backstage App]
    end

    subgraph Scenario B: Direct OIDC Setup
        UserB([User]) -->|HTTPS| BackstageB[Backstage App]
        BackstageB -->|Direct OIDC Handshake| IdP2[Login.gov / UAA]
    end
    
    style Proxy fill:#d1e7dd,stroke:#0f5132
    style BackstageA fill:#cfe2ff,stroke:#084298
    style BackstageB fill:#cfe2ff,stroke:#084298
```

### Scenario A: "Just Need a Session" (Recommended)
* **How it works**: A lightweight proxy (`oauth2-proxy`) sits in front of Backstage, intercepts traffic, handles the OIDC handshake (with Login.gov or Cloud.gov UAA), and forwards verified user credentials in standard downstream HTTP headers (e.g., `X-Forwarded-Email`, `X-Forwarded-User`).
* **Why choose it**: 
  * Extremely secure, isolated, and requires no credential secrets on Backstage.
  * Simple, declarative, and easily whitelists specific email domains or static email lists in `oauth2-proxy`.
* **Config**: Done entirely in `oauth2-proxy` config. Backstage is configured to accept these headers via the standard `oauth2Proxy` provider.

### Scenario B: "Direct OIDC" (Application-Managed)
* **How it works**: Backstage communicates directly with Login.gov or Cloud.gov UAA as an OAuth2/OIDC client. It manages its own login session and prompts users with a sign-in button.
* **Why choose it**: Best if you want Backstage's UI to directly manage logins and display a customizable login landing page.
* **Config**: Provide the OIDC client ID, secret, and discovery metadata URL to Backstage using standard environment variables.

---

## 2. Step-by-Step Deployment Guide

Follow these steps to deploy Backstage on cloud.gov with a persistent PostgreSQL database.

### Step 1: Provision the PostgreSQL Database
Backstage requires a relational database (PostgreSQL) to store application state, catalog relations, and plugin data. Create an AWS RDS PostgreSQL instance in your space:

```bash
cf create-service aws-rds micro-psql backstage-db
```

### Step 2: Build and Push the Application

Using the **recommended buildpack approach**:

```bash
# In your Backstage app directory
yarn install
yarn tsc
yarn build:backend

# Push to cloud.gov
cf push -f manifest.yml --vars-file vars.yml
```

*Note: First deployment takes several minutes due to dependency installation.*

---

## 3. Configuration & SSO Setup

### Configuring Scenario A: Auth Proxy (`oauth2-proxy`)
If you route traffic through `oauth2-proxy`, configure the proxy with the following environment variables:

```yaml
# oauth2-proxy Environment Variables (Configured on the proxy side)
OAUTH2_PROXY_PASS_USER_HEADERS: "true"
OAUTH2_PROXY_SET_XAUTHREQUEST: "true"
```

In Backstage, the corresponding configuration is already active in `app-config.production.yaml`. On startup, Backstage will read the user identity headers injected by `oauth2-proxy` and automatically provision/sign in the corresponding user.

---

### Configuring Scenario B: Direct OIDC with Cloud.gov UAA
To integrate directly with Cloud.gov UAA as your identity provider:

1. Create a Cloud.gov service key or register a custom UAA client:
   ```bash
   cf create-service-key backstage-db uaa-key # Or bind via cloud-gov-identity-provider
   ```
2. Set the following environment variables on the Backstage application in `manifest.yml`:
   ```yaml
   OIDC_CLIENT_ID: "your-uaa-client-id"
   OIDC_CLIENT_SECRET: "your-uaa-client-secret"
   OIDC_METADATA_URL: "https://uaa.fr.cloud.gov/.well-known/openid-configuration"
   ```
3. Set your application's route in the environment:
   ```yaml
   BACKSTAGE_HOST: "backstage.app.cloud.gov"
   ```

---

### Configuring Scenario B: Direct OIDC with Login.gov
To integrate directly with Login.gov (Sandbox or Production):

1. Generate your cryptographic public/private keypair (private key JWT is mandatory for Login.gov):
   ```bash
   openssl genpkey -algorithm RSA -out login_private.pem -pkeyopt rsa_keygen_bits:2048
   openssl rsa -pubout -in login_private.pem -out login_public.pem
   ```
2. Register your Backstage app in the [Login.gov Partner Portal](https://partner.login.gov/). Use your public key and configure the callback URL to:
   ```
   https://backstage.app.cloud.gov/api/auth/oidc/handler/frame
   ```
3. Configure the environment variables in `manifest.yml`:
   ```yaml
   OIDC_CLIENT_ID: "urn:gov:gsa:tts:collab-containers:backstage"
   OIDC_CLIENT_SECRET: "your-private-key-contents-or-token" # Private Key JWT signature
   OIDC_METADATA_URL: "https://idp.sandbox.login.gov/.well-known/openid-configuration"
   BACKSTAGE_HOST: "backstage.app.cloud.gov"
   ```

---

## 4. File Structure & Build Details

| File | Purpose |
|------|---------|
| `Dockerfile` | Experimental multi-stage Docker build (not recommended) |
| `manifest.yml` | Cloud Foundry manifest for Docker + oauth2-proxy deployment |
| `init.sh` | Runtime credential parser for VCAP_SERVICES |
| `app-config.production.yaml` | Production config with cloud.gov database and auth settings |
| `vars.yml` | Deployment variables (routes, secrets, service names) |

---

## 5. Troubleshooting

### Common Issues

**404 on all routes after deployment:**
- The official Backstage Docker image (`ghcr.io/backstage/backstage`) does not include the frontend bundle
- Solution: Build your own image or use the buildpack approach

**Database connection failures:**
- Verify the RDS service is bound: `cf services`
- Check credentials are parsed: `cf ssh backstage-staging` then `echo $VCAP_SERVICES | python3 -m json.tool`

**Native module compilation errors:**
- The buildpack approach handles this automatically
- For Docker: ensure `--platform linux/amd64` and include build dependencies

### Useful Commands

```bash
# Check app status
cf apps

# View recent logs
cf logs backstage-staging --recent

# SSH into container for debugging
cf ssh backstage-staging

# Check network policies (for oauth2-proxy setup)
cf network-policies

# Add network policy for proxy -> app communication
cf add-network-policy backstage-proxy-staging backstage-staging --port 8080 --protocol tcp
```

---

## 6. Next Steps

- [ ] Create a dedicated Backstage fork/repo with cloud.gov-specific configuration
- [ ] Set up CI/CD pipeline for automated builds and deployments
- [ ] Evaluate Zitadel as an alternative auth provider (see `/zitadel` directory)
- [ ] Configure Backstage plugins for catalog, TechDocs, and scaffolder
