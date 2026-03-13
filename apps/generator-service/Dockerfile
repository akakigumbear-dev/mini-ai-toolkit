FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace root + package manifests
COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/generator-service/package.json ./apps/generator-service/

# Install all dependencies
RUN npm install --workspace=apps/generator-service --workspace=packages/shared-types --include-workspace-root

# Copy source
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/generator-service/ ./apps/generator-service/
COPY tsconfig.base.json ./

# Build shared-types first, then generator-service
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=apps/generator-service

# Production
FROM node:20-alpine
WORKDIR /app

COPY --from=base /app/package.json ./
COPY --from=base /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=base /app/packages/shared-types/dist/ ./packages/shared-types/dist/
COPY --from=base /app/apps/generator-service/package.json ./apps/generator-service/
COPY --from=base /app/apps/generator-service/dist/ ./apps/generator-service/dist/

RUN npm install --workspace=apps/generator-service --workspace=packages/shared-types --include-workspace-root --omit=dev

CMD ["node", "apps/generator-service/dist/main.js"]
