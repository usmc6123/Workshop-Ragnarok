# Stage 1: Build the React frontend
FROM node:18-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build the Node.js/Express backend
FROM node:18-slim

# Install system dependencies needed for compiling sqlite3 if prebuild is unavailable
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source files
COPY backend/server.js ./
COPY backend/ingestion.js ./
COPY backend/middleware ./middleware

# Copy compiled frontend from Stage 1 into backend's public folder
COPY --from=frontend-builder /app/dist ./dist

# Set default environment configuration
ENV PORT=4000
ENV NODE_ENV=production
ENV LEMON_SERVER_URL=http://lemon-server:8080
ENV DB_PATH=/data/db/workshop.db

# Expose API and frontend static file server port
EXPOSE 4000

# Start Express server
CMD [ "node", "server.js" ]
