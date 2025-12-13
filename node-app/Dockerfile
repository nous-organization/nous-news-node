# ---- Base image ----
FROM node:22-slim

WORKDIR /app

# Install required system deps for onnxruntime-node
RUN apt-get update && apt-get install -y \
  python3 \
  build-essential \
  libc6 \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

# Copy rest of the app
COPY . .

# Make scripts executable
RUN chmod +x ./scripts/*.sh

# Build TypeScript
RUN npm run prebuild && npm run build

# Expose Node port
EXPOSE 9001

CMD ["node", "dist/setup.js"]
