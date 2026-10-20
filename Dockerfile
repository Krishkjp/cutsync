FROM node:22-bullseye-slim

# Install ffmpeg for audio rendering and ebur128 mastering
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Build frontend production assets
RUN npm run build

# Expose API port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start CutSync Full-Stack Engine
CMD ["npx", "tsx", "server.ts"]
