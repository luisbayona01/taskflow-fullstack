#!/bin/sh
set -e

# ---------------------------------------------------------------------------
# Espera a que MySQL acepte conexiones.
# ---------------------------------------------------------------------------
until mysqladmin ping -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" --skip-ssl --silent; do
  echo "Esperando a MySQL..."
  sleep 2
done

cd /var/www/html

# ---------------------------------------------------------------------------
# Permisos: el volumen de `storage` puede pertenecer a otro uid.
# ---------------------------------------------------------------------------
chown -R www-data:www-data storage bootstrap/cache
chmod -R 775 storage

# ---------------------------------------------------------------------------
# Archivo .env persistente (dentro del volumen de storage).
#
# Se genera con los valores del entorno en lugar de montarlo desde el host,
# así no hay que versionar secretos ni depender del .env del desarrollo local.
# ---------------------------------------------------------------------------
ENV_FILE=storage/app/docker.env

if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
APP_NAME=${APP_NAME}
APP_ENV=${APP_ENV}
APP_KEY=
APP_DEBUG=${APP_DEBUG}
APP_URL=${APP_URL}
APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US
APP_MAINTENANCE_DRIVER=file
BCRYPT_ROUNDS=12
LOG_CHANNEL=stack
LOG_STACK=daily
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=info
DB_CONNECTION=${DB_CONNECTION}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_DATABASE=${DB_DATABASE}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}
SESSION_DRIVER=${SESSION_DRIVER}
SESSION_LIFETIME=120
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=${QUEUE_CONNECTION}
CACHE_STORE=${CACHE_STORE}
MAIL_MAILER=log
L5_SWAGGER_GENERATE_ALWAYS=false
L5_SWAGGER_USE_ABSOLUTE_PATH=${L5_SWAGGER_USE_ABSOLUTE_PATH}
L5_FORMAT_TO_USE_FOR_DOCS=json
EOF
  chmod 640 "$ENV_FILE"
fi

cp "$ENV_FILE" .env

# ---------------------------------------------------------------------------
# APP_KEY: se genera una sola vez y se conserva entre reinicios.
# ---------------------------------------------------------------------------
if ! grep -q '^APP_KEY=base64:' .env; then
  php artisan key:generate --force
  cp .env "$ENV_FILE"
fi

php artisan config:clear

# ---------------------------------------------------------------------------
# Esquema de la base de datos.
# ---------------------------------------------------------------------------
php artisan migrate --force

# Datos de demostración sólo la primera vez: DemoSeeder crea correos fijos y
# fallaría en una segunda ejecución por la restricción de unicidad.
USER_COUNT=$(php artisan tinker --execute='echo \App\Models\User::query()->count();' 2>/dev/null | tail -n 1 | tr -cd '0-9')

if [ "${USER_COUNT:-0}" = "0" ]; then
  php artisan db:seed --class=DemoSeeder --force --no-interaction
fi

exec php-fpm
