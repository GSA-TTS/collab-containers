# =================================================================
# STAGE 1: Build the Backstage Application (using full bookworm to build native packages)
# =================================================================
FROM node:20-bookworm AS build

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

WORKDIR /app

# Install build dependencies for native modules
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    g++ \
    build-essential \
    libsecret-1-dev \
    && rm -rf /var/lib/apt/lists/*

# Setup git configuration required for npx @backstage/create-app and yarn builds
RUN git config --global user.email "cloud-gov-deploy@gsa.gov" && \
    git config --global user.name "Cloud.gov Deploy"

# Bootstrap standard Backstage app non-interactively
# We select PostgreSQL as the default database for production cloud.gov RDS
RUN printf "backstage-app\nPostgreSQL\n" | npx @backstage/create-app@latest --skip-install && \
    mv backstage-app/* . && \
    mv backstage-app/.* . 2>/dev/null || true && \
    rm -rf backstage-app

# Copy our cloud.gov-optimized configuration
COPY app-config.production.yaml /app/app-config.production.yaml

# Install dependencies and build the backend
RUN yarn install && \
    yarn tsc && \
    yarn build:backend

# Extract the skeleton and bundle for the production image
RUN mkdir -p packages/backend/dist/skeleton packages/backend/dist/bundle \
    && tar xzf packages/backend/dist/skeleton.tar.gz -C packages/backend/dist/skeleton \
    && tar xzf packages/backend/dist/bundle.tar.gz -C packages/backend/dist/bundle

# =================================================================
# STAGE 2: Lightweight Production Runner
# =================================================================
FROM node:20-bookworm-slim AS runner

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install runtime dependencies
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    g++ \
    build-essential \
    libsecret-1-dev \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

USER node

WORKDIR /app

# Copy yarn configuration from build stage
COPY --from=build --chown=node:node /app/.yarn ./.yarn
COPY --from=build --chown=node:node /app/.yarnrc.yml ./
COPY --from=build --chown=node:node /app/yarn.lock /app/package.json ./
COPY --from=build --chown=node:node /app/packages/backend/dist/skeleton/ ./

# Install production dependencies only
RUN yarn workspaces focus --all --production

# Copy the built bundle
COPY --from=build --chown=node:node /app/packages/backend/dist/bundle/ ./

# Copy app configs
COPY --from=build --chown=node:node /app/app-config.yaml ./
COPY --chown=node:node app-config.production.yaml ./

# Copy and setup the startup script
COPY --chown=node:node init.sh /app/init.sh
RUN chmod +x /app/init.sh

# Expose default cloud.gov proxy port
EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["/app/init.sh"]
