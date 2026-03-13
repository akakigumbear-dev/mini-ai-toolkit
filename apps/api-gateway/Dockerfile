FROM node:18-alpine AS base
WORKDIR /app

# Copy workspace root
COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api-gateway/package.json ./apps/api-gateway/

# Install dependencies
RUN npm install --workspace=apps/api-gateway --include-workspace-root

# Copy source
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/api-gateway/ ./apps/api-gateway/
COPY tsconfig.base.json ./

# Build
RUN npm run build --workspace=apps/api-gateway

# Production
FROM node:18-alpine
WORKDIR /app

COPY --from=base /app/package.json ./
COPY --from=base /app/packages/shared-types/ ./packages/shared-types/
COPY --from=base /app/apps/api-gateway/package.json ./apps/api-gateway/
COPY --from=base /app/apps/api-gateway/dist/ ./apps/api-gateway/dist/

RUN npm install --workspace=apps/api-gateway --include-workspace-root --omit=dev

EXPOSE 3001
CMD ["node", "apps/api-gateway/dist/main.js"]
