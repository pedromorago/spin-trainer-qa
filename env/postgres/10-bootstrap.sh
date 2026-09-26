#!/bin/sh
# Prepares the database like a real environment: runs the API's bootstrap.sql (roles spin_migrator and spin_app)
# with psql and the QA passwords. Postgres runs it once, when the volume is created.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v migrator_password="$SPIN_MIGRATOR_PASSWORD" \
  -v app_password="$SPIN_APP_PASSWORD" \
  -f /bootstrap/bootstrap.sql
