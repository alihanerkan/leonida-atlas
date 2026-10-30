#!/bin/sh
set -e
cd /app

# Laravel needs a 32-byte key; derive one deterministically from whatever secret the host provides.
case "$APP_KEY" in
  base64:*) ;;
  "") echo "APP_KEY is not set" >&2; exit 1 ;;
  *) export APP_KEY="$(php -r 'echo "base64:".base64_encode(hash("sha256", getenv("APP_KEY"), true));')" ;;
esac
export APP_URL="${APP_URL:-$RENDER_EXTERNAL_URL}"

# SQLite lives on the container disk: a fresh container starts from the seeded content.
DB="${DB_DATABASE:-/app/database/database.sqlite}"
FRESH=0
[ -f "$DB" ] || { touch "$DB"; FRESH=1; }
php artisan migrate --force
[ "$FRESH" = "1" ] && php artisan db:seed --force

php artisan storage:link >/dev/null 2>&1 || true
php artisan config:cache
php artisan route:cache
php artisan view:cache

exec frankenphp php-server --root public/ --listen ":${PORT:-8080}"
