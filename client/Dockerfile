FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared module
COPY shared/ ./shared/

# Copy client package and install
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install

# Copy source and build
COPY client/ ./
RUN npm run build

# Serve with lightweight web server
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/client/dist ./dist

EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
