# Multi-stage build for QA Agent Service
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
RUN adduser --system --uid 1001 qaagent

# Create workspace directory
RUN mkdir -p /app/workspace && chown qaagent:nodejs /app/workspace

# Copy built application
COPY --from=builder --chown=qaagent:nodejs /app/dist ./dist
COPY --from=deps --chown=qaagent:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=qaagent:nodejs /app/package*.json ./

USER qaagent

EXPOSE 3013

ENV PORT=3013
ENV HOST=0.0.0.0
ENV AGENT_TYPE=QUALITY_ASSURANCE
ENV WORKING_DIRECTORY=/app/workspace

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3013/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/index.js"]
