FROM node:20-alpine

WORKDIR /app

# Copy shared library
COPY shared/ ./shared/

# Copy server package files and install dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# Copy server source files
COPY server/ ./

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
