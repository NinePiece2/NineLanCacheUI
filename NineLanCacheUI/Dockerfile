FROM node:24-alpine AS build

ARG SYNCFUSION_LICENSE
ARG VERSION=dev
ENV SYNCFUSION_LICENSE=${SYNCFUSION_LICENSE}
ENV NEXT_PUBLIC_VERSION=${VERSION}
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npx syncfusion-license activate
RUN export SYNCFUSION_LICENSE=""

RUN npm run build

FROM node:24-alpine AS deploy

ARG VERSION=dev
ARG BUILD_DATE
ARG VCS_REF

LABEL org.opencontainers.image.title="NineLanCacheUI" \
      org.opencontainers.image.description="Modern UI for LanCache" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/NinePiece2/NineLanCacheUI" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.licenses="MIT"

ENV VERSION=${VERSION}

# Install NGINX and gettext (for envsubst)
RUN apk add --no-cache nginx gettext

WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
RUN npm ci --only=production

# Copy the build output (assuming a Next.js app using .next and public folders)
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Copy custom NGINX config as template
COPY ./nginx.conf /etc/nginx/nginx.conf.template
COPY --from=build /app/run.sh ./

# Create NGINX run dirs and cache directory for image optimization
RUN mkdir -p /run/nginx /tmp/nginx_cache && \
    chmod 777 /tmp/nginx_cache

EXPOSE 3000
EXPOSE 80

RUN chmod +x run.sh 
CMD ["./run.sh"]