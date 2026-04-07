FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_AI_BACKEND_URL=/api
ENV VITE_AI_BACKEND_URL=${VITE_AI_BACKEND_URL}

RUN npm run typecheck && npm run dev:build

FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dev/dist /usr/share/nginx/html

EXPOSE 80
