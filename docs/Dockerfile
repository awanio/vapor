# Multi-stage Dockerfile for VitePress documentation

# Stage 1: Build the VitePress site
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all documentation files
COPY . .

# Build the VitePress site
RUN npm run docs:build

# Stage 2: Serve the built site with nginx
FROM nginx:alpine

# Copy the built static files
COPY --from=builder /app/.vitepress/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
