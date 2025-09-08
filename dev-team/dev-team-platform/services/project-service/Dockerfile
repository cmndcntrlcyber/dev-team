# Multi-stage build for Project Service
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package*.json ./
RUN npm install --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Build TypeScript if tsconfig exists
RUN if [ -f "tsconfig.json" ]; then npm run build; fi

# Production image, copy all the files and run
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 projectsvc

# Create data directory for projects
RUN mkdir -p /app/data/projects && chown projectsvc:nodejs /app/data/projects

# Copy built application
COPY --from=builder --chown=projectsvc:nodejs /app/dist ./dist
COPY --from=deps --chown=projectsvc:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=projectsvc:nodejs /app/package*.json ./
COPY --from=builder --chown=projectsvc:nodejs /app/templates ./templates

USER projectsvc

EXPOSE 3002

ENV PORT=3002
ENV HOST=0.0.0.0

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
