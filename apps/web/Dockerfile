FROM node:18-alpine AS base
WORKDIR /app

# Copy workspace root
COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm install --workspace=apps/web --include-workspace-root

# Copy source
COPY packages/shared-types/ ./packages/shared-types/
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./

# Build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=apps/web

# Production
FROM node:18-alpine
WORKDIR /app

COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=base /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
