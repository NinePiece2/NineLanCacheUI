#!/bin/sh

# Set default API_PORT if not provided
export API_PORT=${API_PORT:-7401}

# Substitute environment variables in nginx config
envsubst '${API_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start Next.js and nginx
npx concurrently "npm start" "nginx -g 'daemon off;'"