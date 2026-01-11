# ==============================================================================
# Stage 1: Builder - Compile llama.cpp and TypeScript
# ==============================================================================
FROM node:lts-slim AS builder

# Install build dependencies required for llama.cpp compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake \
    g++ \
    make \
    python3 \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (runs postinstall scripts to build llama.cpp)
RUN npm install

# Copy source code
COPY . .

# Compile TypeScript
RUN npm run compile

# ==============================================================================
# Stage 2: Production dependencies only
# ==============================================================================
FROM node:lts-slim AS deps

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies (skip scripts since binaries will be copied)
RUN npm ci --omit=dev --ignore-scripts

# Copy prebuilt llama.cpp binaries from builder
COPY --from=builder /usr/src/app/node_modules/node-llama-cpp ./node_modules/node-llama-cpp
COPY --from=builder /usr/src/app/node_modules/@node-llama-cpp ./node_modules/@node-llama-cpp

# Clean up unnecessary files to reduce image size:
# - Remove non-Linux platform binaries (mac, win)
# - Remove typescript (peer optional, not needed at runtime)
# - Remove source files and local build artifacts from node-llama-cpp
RUN find node_modules/@node-llama-cpp -maxdepth 1 -type d \( -name "mac-*" -o -name "win-*" \) -exec rm -rf {} + 2>/dev/null || true && \
    rm -rf node_modules/typescript && \
    rm -rf node_modules/node-llama-cpp/llama && \
    rm -rf node_modules/node-llama-cpp/src && \
    rm -rf node_modules/node-llama-cpp/*.md && \
    rm -rf node_modules/node-llama-cpp/tsconfig*.json

# ==============================================================================
# Stage 3: Production - Minimal runtime image
# ==============================================================================
FROM node:lts-slim AS production

# Create app directory
WORKDIR /usr/src/app

# Copy compiled output
COPY --from=builder /usr/src/app/out ./out

# Copy production node_modules
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy package.json for npm start
COPY package.json ./

# Run command
CMD ["npm", "run", "start"]
