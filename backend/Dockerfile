# Imagen del backend de TaskFlow (Laravel 12 sobre PHP 8.2 FPM).
#
# Etapa 1: compila los assets de Vite/Tailwind del propio backend.
# Etapa 2: PHP-FPM con las extensiones que necesita Laravel y l5-swagger.

FROM node:22-alpine AS assets

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build


FROM php:8.2-fpm

WORKDIR /var/www/html

# Extensiones del sistema y de PHP necesarias para Laravel 12 + l5-swagger.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        libzip-dev \
        unzip \
        libonig-dev \
        libxml2-dev \
        default-mysql-client \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring xml zip bcmath opcache \
    && rm -rf /var/lib/apt/lists/*

RUN { \
        echo 'upload_max_filesize = 50M'; \
        echo 'post_max_size = 52M'; \
        echo 'memory_limit = 256M'; \
    } > /usr/local/etc/php/conf.d/taskflow.ini

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Código de la aplicación
COPY . .

# Assets compilados en la etapa anterior (manifest de Vite).
COPY --from=assets /app/public/build /var/www/html/public/build

RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 755 storage bootstrap/cache \
    && chmod +x docker-entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/var/www/html/docker-entrypoint.sh"]
