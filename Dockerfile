# --------- Build Stage ---------
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build


# --------- Production Stage ---------
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy only necessary files from build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Install only production dependencies (optional if needed)
RUN npm install --omit=dev

# Expose port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main.js"]
