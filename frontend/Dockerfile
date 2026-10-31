# Imagen del frontend de TaskFlow (SPA de Vue 3 + Vite servida por Nginx).
#
# Etapa 1: `npm ci` + `npm run build` (vue-tsc + vite build).
# Etapa 2: Nginx sirve `dist/` y hace de proxy de `/api` hacia el backend.

FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build


FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
