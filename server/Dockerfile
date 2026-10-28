FROM node:20-alpine

WORKDIR /app

# Copy shared module
COPY shared/ ./shared/

# Copy server package and install
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# Copy server sources
COPY server/ ./

EXPOSE 5000
CMD ["node", "src/server.js"]
