#!/bin/sh
# Prepara la base de datos como un entorno real: ejecuta el bootstrap.sql de la API (roles spin_migrator y spin_app)
# con psql y las contraseñas de QA. Postgres lo lanza una vez, al crear el volumen.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v migrator_password="$SPIN_MIGRATOR_PASSWORD" \
  -v app_password="$SPIN_APP_PASSWORD" \
  -f /bootstrap/bootstrap.sql
