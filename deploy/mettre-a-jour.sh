#!/usr/bin/env bash
# Met SOFARY à jour avec la dernière version des dépôts GitHub (à lancer en root sur le serveur).
#
#   bash /opt/sofary/koerebackkend/deploy/mettre-a-jour.sh
set -euo pipefail

DOSSIER=/opt/sofary

# Sauvegarde avant toute mise à jour
/usr/local/bin/sofary-sauvegarde || echo "Attention : la sauvegarde a échoué."

for nom in koerebackkend koerefrontend; do
  branche=$(git -C "$DOSSIER/$nom" rev-parse --abbrev-ref HEAD)
  git -C "$DOSSIER/$nom" pull -q --ff-only origin "$branche"
  echo "$nom : $(git -C "$DOSSIER/$nom" log -1 --format='%h %s')"
done

cd "$DOSSIER/koerebackkend/deploy"
docker compose up -d --build
docker image prune -f >/dev/null
docker compose ps
