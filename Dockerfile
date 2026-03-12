FROM node:22-slim

# 1. Install Chrome Dependencies (Hard-coded for Debian Bookworm)
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 \
    libgtk-3-0 libpango-1.0-0 libcairo2 libasound2 libx11-6 libx11-xcb1 \
    libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates \
    fonts-liberation libappindicator3-1 lsb-release xdg-utils wget \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Copy dependency files
COPY package*.json ./

# 3. Install ALL dependencies first
RUN npm ci

# 4. Copy the ENTIRE project (This includes your models in src/prisma)
COPY . .

# 5. Generate Prisma Client (Now it has the full schema with your 'user' models)
RUN npx prisma generate --schema=./src/prisma/schema.prisma

# 6. Build the app (tsc will now see the models and properties)
RUN npm run build

# 7. Bundle Chrome
RUN npx puppeteer browsers install chrome

EXPOSE 8080

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]