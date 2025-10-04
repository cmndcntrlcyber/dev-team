FROM node:20-alpine AS builder

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

WORKDIR /app

# Copy app package files
COPY app/package*.json ./

# Install dependencies
RUN npm install --production=false

# Copy app source code
COPY app/ .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install system dependencies for production
RUN apk add --no-cache \
    docker \
    docker-compose \
    postgresql-client

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S devteam -u 1001

WORKDIR /app

# Copy app package files
COPY app/package*.json ./

# Copy all dependencies from builder (includes vite and other devDependencies needed at runtime)
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy shared schema for database migrations
COPY --from=builder /app/shared ./shared

# Copy drizzle config for database migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Create necessary directories
RUN mkdir -p uploads postgres-data redis-data && \
    chown -R devteam:nodejs uploads postgres-data redis-data

# Switch to non-root user
USER devteam

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application with database setup
CMD ["sh", "-c", "npm run db:push && npm start"]
