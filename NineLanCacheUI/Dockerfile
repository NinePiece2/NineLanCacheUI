FROM node:22-alpine AS build

ARG SYNCFUSION_LICENSE
ENV SYNCFUSION_LICENSE=${SYNCFUSION_LICENSE}

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npx syncfusion-license activate
RUN export SYNCFUSION_LICENSE=""

RUN npm run build

FROM node:22-alpine AS deploy

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

# Create NGINX run dirs
RUN mkdir -p /run/nginx

EXPOSE 3000
EXPOSE 80

RUN chmod +x run.sh 
CMD ["./run.sh"]