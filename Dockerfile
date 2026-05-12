FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .

ARG VITE_AI_BACKEND_URL=/api
ENV VITE_AI_BACKEND_URL=${VITE_AI_BACKEND_URL}

RUN pnpm run typecheck && pnpm run dev:build

FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dev/dist /usr/share/nginx/html

EXPOSE 80
