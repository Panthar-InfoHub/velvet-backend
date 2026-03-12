# 1. Base image
FROM node:22-slim

# 2. Install Chrome dependencies (Debian Bookworm optimized)
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Handle Dependencies
COPY package*.json ./
COPY prisma ./prisma/ 

# Install everything
RUN npm ci

# 4. Generate Prisma Client
RUN npx prisma generate

# 5. Copy source and build
COPY . .
RUN npm run build

# 6. Ensure Chrome is bundled
RUN npx puppeteer browsers install chrome

EXPOSE 8080

# 7. Start: migrations at RUNTIME
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]