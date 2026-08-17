FROM node:20-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y curl git python3 make g++

# Install Noir
RUN curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash && \
    /root/.nargo/bin/noirup -v 1.0.0-beta.22

ENV PATH="/root/.nargo/bin:${PATH}"
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies for backend
RUN pnpm install --filter atreus-backend

# Copy backend source
COPY backend ./backend

# Build backend
WORKDIR /app/backend
RUN pnpm build

# Default to API server, but can be overridden by CMD
CMD ["node", "dist/index.js"]
