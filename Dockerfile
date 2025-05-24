# ScreenShare Signaling Server Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code
COPY src/ ./src/
COPY config/ ./config/
COPY public/ ./public/

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S screenshare -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R screenshare:nodejs /app

# Switch to non-root user
USER screenshare

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/config || exit 1

# Start the application
CMD ["node", "src/server.js"]
