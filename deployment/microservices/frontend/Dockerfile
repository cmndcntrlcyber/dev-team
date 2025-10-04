# Frontend Dockerfile for microservices deployment
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY app/package.json app/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy client source code
COPY app/client ./client
COPY app/shared ./shared
COPY app/vite.config.ts ./
COPY app/tailwind.config.ts ./
COPY app/postcss.config.js ./
COPY app/components.json ./
COPY app/tsconfig.json ./

# Build the frontend
RUN npx vite build

# Production stage
FROM nginx:alpine

# Copy built assets to nginx
COPY --from=builder /app/dist/public /usr/share/nginx/html

# Copy nginx configuration
COPY deployment/microservices/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3080

CMD ["nginx", "-g", "daemon off;"]
