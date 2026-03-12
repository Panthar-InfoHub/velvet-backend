# 1. Base image
FROM node:22-slim

# 2. Install Chrome dependencies (The missing .so files)
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libnssutil3 libsmime3 libatk1.0-0 libatk-bridge2.0-0 \
    libdbus-1-3 libcups2 libxcb1 libxkbcommon0 libatspi0 libx11-6 \
    libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 \
    libcairo2 libpango-1.0-0 libasound2 curl --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Handle Dependencies
COPY package*.json ./
# Copy your prisma directory specifically
COPY prisma ./prisma/ 

# Install everything (this will run your postinstall too)
RUN npm ci

# 4. Generate Prisma Client (DOES NOT NEED A LIVE DATABASE)
# This creates the binaries and types Prisma needs in node_modules
RUN npx prisma generate

# 5. Copy source and build
COPY . .
RUN npm run build

# 6. Ensure Chrome is bundled correctly for the final image
RUN npx puppeteer browsers install chrome

EXPOSE 8080

# 7. Start: We handle migrations at RUNTIME, not build time
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]