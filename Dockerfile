FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Build the frontend
RUN npm run build

# Expose the port (default 3000)
EXPOSE 3000

# Start the unified server
CMD ["npx", "tsx", "server.ts"]
