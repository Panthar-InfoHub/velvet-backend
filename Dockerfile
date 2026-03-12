FROM node:22-slim

# 1. Install Chrome Dependencies
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 \
    libgtk-3-0 libpango-1.0-0 libcairo2 libasound2 libx11-6 libx11-xcb1 \
    libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates \
    fonts-liberation libappindicator3-1 lsb-release xdg-utils wget \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Copy Package files
COPY package*.json ./

# 3. Copy Prisma from src/prisma into ./prisma for the generator
# This fixes the "file not found" error by pointing to the correct source
COPY src/prisma ./prisma

# 4. Install & Generate
RUN npm ci
RUN npx prisma generate

# 5. Copy everything else & Build
COPY . .
RUN npm run build

# 6. Install Chrome binary
RUN npx puppeteer browsers install chrome

EXPOSE 8080

# 7. Runtime: Start the app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]