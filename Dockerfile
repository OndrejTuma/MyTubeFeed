# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Add build arguments for memory management
ARG NODE_OPTIONS="--max-old-space-size=2048"
ENV NODE_OPTIONS=${NODE_OPTIONS}

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build with production optimization
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy only necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 99

ENV PORT 99
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"] 