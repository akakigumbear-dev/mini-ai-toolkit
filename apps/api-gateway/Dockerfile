FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace root + package manifests
COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api-gateway/package.json ./apps/api-gateway/

# Install all dependencies
RUN npm install --workspace=apps/api-gateway --workspace=packages/shared-types --include-workspace-root

# Copy source
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/api-gateway/ ./apps/api-gateway/
COPY tsconfig.base.json ./

# Build shared-types first, then api-gateway
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=apps/api-gateway

# Production
FROM node:20-alpine
WORKDIR /app

COPY --from=base /app/package.json ./
COPY --from=base /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=base /app/packages/shared-types/dist/ ./packages/shared-types/dist/
COPY --from=base /app/apps/api-gateway/package.json ./apps/api-gateway/
COPY --from=base /app/apps/api-gateway/dist/ ./apps/api-gateway/dist/

RUN npm install --workspace=apps/api-gateway --workspace=packages/shared-types --include-workspace-root --omit=dev

EXPOSE 3001
CMD ["node", "apps/api-gateway/dist/main.js"]
