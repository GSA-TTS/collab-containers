# =================================================================
# STAGE 1: Build the Backstage Application (full Debian image, used to build native packages)
# =================================================================
FROM node:22-trixie AS build

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
# create-app is pinned for reproducible builds; bump deliberately.
RUN printf "backstage-app\nPostgreSQL\n" | npx --yes @backstage/create-app@0.9.3 --skip-install && \
    cp -a backstage-app/. . && \
    rm -rf backstage-app && \
    test -f package.json

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

# Install production dependencies here, where the compiler toolchain exists, so
# the runtime image does not need build tools (smaller attack surface).
RUN mkdir -p /prod \
    && cp -a .yarn .yarnrc.yml yarn.lock package.json /prod/ \
    && cp -a packages/backend/dist/skeleton/. /prod/

WORKDIR /prod
RUN yarn workspaces focus --all --production

RUN cp -a /app/packages/backend/dist/bundle/. /prod/ \
    && cp /app/app-config.yaml /app/app-config.production.yaml /prod/

# =================================================================
# STAGE 2: Lightweight Production Runner (no compiler toolchain)
# =================================================================
FROM node:22-trixie-slim AS runner

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

WORKDIR /app

# Production dependencies and bundle prepared in the build stage
COPY --from=build --chown=node:node /prod/ ./

# Copy and setup the startup script
COPY --chown=node:node init.sh /app/init.sh
RUN chmod +x /app/init.sh

USER node

# Expose default cloud.gov proxy port
EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["/app/init.sh"]
