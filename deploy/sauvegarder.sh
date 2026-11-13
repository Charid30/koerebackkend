#!/usr/bin/env bash
# Sauvegarde la base et les fichiers téléversés de SOFARY ; conserve 14 jours.
set -euo pipefail

CIBLE=/opt/sofary/sauvegardes
DATE=$(date +%Y-%m-%d_%H%M)
mkdir -p "$CIBLE"
chmod 700 "$CIBLE"

cd /opt/sofary/koerebackkend/deploy

# Base de données (le mot de passe root reste dans le conteneur)
docker compose exec -T db sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --databases koere_db' \
  | gzip > "$CIBLE/base-$DATE.sql.gz"

# Fichiers téléversés (photos des OT, DI, véhicules)
docker compose exec -T api tar -C /app -czf - uploads > "$CIBLE/fichiers-$DATE.tar.gz"

find "$CIBLE" -type f -mtime +14 -delete
echo "$(date '+%F %T') sauvegarde OK : $CIBLE/base-$DATE.sql.gz"
