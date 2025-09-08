# Multi-stage build for Task Service
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

# Build TypeScript
RUN npm run build

# Production image, copy all the files and run
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 tasksvc

# Copy built application
COPY --from=builder --chown=tasksvc:nodejs /app/dist ./dist
COPY --from=deps --chown=tasksvc:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=tasksvc:nodejs /app/package*.json ./

USER tasksvc

EXPOSE 3003

ENV PORT=3003
ENV HOST=0.0.0.0

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
