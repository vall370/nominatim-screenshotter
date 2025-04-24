# Use Node.js as the base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install Puppeteer globally without Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install puppeteer --global

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the application files
COPY . .

# Create public directory
RUN mkdir -p public

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# Expose the port the app runs on
EXPOSE ${PORT:-3000}

# Command to run the application
CMD ["node", "map-screenshot-service.js"]