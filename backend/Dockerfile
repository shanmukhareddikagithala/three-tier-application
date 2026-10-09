# Stage 1: Build dependencies
FROM node:20-alpine AS builder

# Required for building better-sqlite3 from source natively
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Stage 2: Final runtime image
FROM node:20-alpine

WORKDIR /app

# Copy built app from builder stage
COPY --from=builder /app /app

# Ensure SQLite data directory exists and node user owns /app
RUN mkdir -p /app/data && chown -R node:node /app

# Run as unprivileged node user
USER node

EXPOSE 5000

# We use nodemon for dev mode. In production, this can be overridden to `npm start`
CMD ["npm", "run", "dev"]
