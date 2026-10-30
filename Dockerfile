# syntax=docker/dockerfile:1

# 1) PHP dependencies
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist --ignore-platform-reqs
COPY . .
RUN composer dump-autoload --optimize --no-dev --no-scripts

# 2) Front-end build (Ziggy is imported from vendor)
FROM node:22-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
COPY --from=vendor /app/vendor/tightenco ./vendor/tightenco
RUN npm run build

# 3) Runtime: FrankenPHP (Caddy + PHP 8.4)
FROM dunglas/frankenphp:1-php8.4
RUN install-php-extensions pdo_sqlite gd intl zip opcache pcntl bcmath
# The base image grants frankenphp a file capability (to bind ports < 1024). Hosts such as Render
# forbid file capabilities ("Operation not permitted"), and we listen on $PORT (> 1024), so drop it.
RUN apt-get update && apt-get install -y --no-install-recommends libcap2-bin \
    && (setcap -r /usr/local/bin/frankenphp || true) \
    && rm -rf /var/lib/apt/lists/*
COPY docker/php.ini /usr/local/etc/php/conf.d/zz-atlas.ini
WORKDIR /app
COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=assets /app/public/build ./public/build
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && php artisan package:discover --ansi \
    && chmod +x docker/start.sh
ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr
EXPOSE 8080
CMD ["/app/docker/start.sh"]
