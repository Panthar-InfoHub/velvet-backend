FROM node:22-slim

# 1. Install Chrome Dependencies (The essential .so files)
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 \
    libgtk-3-0 libpango-1.0-0 libcairo2 libasound2 libx11-6 libx11-xcb1 \
    libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates \
    fonts-liberation libappindicator3-1 lsb-release xdg-utils wget \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Copy dependencies and install
COPY package*.json ./
RUN npm ci

# 3. Copy EVERYTHING into the container
COPY . .

# 4. FIX: Provide the dummy DATABASE_URL inline to satisfy the generator
# This fixes the "Cannot resolve environment variable" error from your last build.
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate --schema=./src/prisma/schema.prisma

# 5. Build the TypeScript code
RUN npm run build

# 6. Install the Chrome binary into the container
RUN npx puppeteer browsers install chrome

EXPOSE 8080

# 7. Start: migrations at RUNTIME with the real Cloud Run DATABASE_URL
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]