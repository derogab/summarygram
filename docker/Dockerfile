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

# Install only production dependencies without re-running native build scripts
RUN npm ci --omit=dev --ignore-scripts && rm -rf /root/.npm

# Copy prebuilt llama.cpp and smart-whisper binaries from builder
COPY --from=builder /usr/src/app/node_modules/node-llama-cpp ./node_modules/node-llama-cpp
COPY --from=builder /usr/src/app/node_modules/@node-llama-cpp ./node_modules/@node-llama-cpp
COPY --from=builder /usr/src/app/node_modules/smart-whisper ./node_modules/smart-whisper

# Clean up unnecessary files to reduce image size
RUN find node_modules/@node-llama-cpp -maxdepth 1 -type d \( -name "mac-*" -o -name "win-*" \) -exec rm -rf {} + 2>/dev/null || true && \
    rm -rf node_modules/typescript && \
    rm -rf node_modules/node-llama-cpp/src && \
    rm -rf node_modules/node-llama-cpp/*.md && \
    rm -rf node_modules/node-llama-cpp/tsconfig*.json && \
    rm -rf node_modules/smart-whisper/src && \
    rm -rf node_modules/smart-whisper/scripts && \
    rm -rf node_modules/smart-whisper/whisper.cpp && \
    rm -rf node_modules/smart-whisper/README.md && \
    rm -rf node_modules/smart-whisper/binding.gyp

# ==============================================================================
# Stage 3: Static ffmpeg binaries
# ==============================================================================
FROM mwader/static-ffmpeg:7.1.1 AS ffmpeg

# ==============================================================================
# Stage 4: Production - Minimal runtime image
# ==============================================================================
FROM node:lts-slim AS production

# Create app directory
WORKDIR /usr/src/app

# Remove Node.js build-time extras not needed at runtime.
RUN rm -rf /usr/local/include && \
    rm -rf /usr/local/lib/node_modules/npm && \
    rm -rf /usr/local/lib/node_modules/corepack && \
    rm -rf /opt/yarn-v* && \
    rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg

# Copy compiled output
COPY --from=builder /usr/src/app/out ./out

# Copy production node_modules
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy static ffmpeg binaries used by whisper.cpp transcription.
COPY --from=ffmpeg /ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /ffprobe /usr/local/bin/ffprobe

# Run command
CMD ["node", "./out"]
