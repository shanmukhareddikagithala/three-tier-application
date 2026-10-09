# Stage 1: Build dependencies
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Stage 2: Final runtime image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 5173

# Run Vite dev server exposed to host network
CMD ["npm", "run", "dev", "--", "--host"]
