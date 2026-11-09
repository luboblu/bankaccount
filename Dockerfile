# Reproducible verification image. This repository does not yet expose a web-server entry point,
# so this image intentionally validates the adapter core instead of claiming to run the product.
FROM node:22-bookworm-slim AS verify

WORKDIR /app
ENV CI=true

COPY package.json ./
# TypeScript is pinned exactly in package.json. Add package-lock.json once the
# repository's dependency mirror is available, then replace this with npm ci.
RUN npm install --ignore-scripts --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests
RUN npm run verify
